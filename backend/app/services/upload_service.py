"""File upload service (S3-compatible)."""
import logging
import mimetypes
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)


class UploadService:
    """Service for handling file uploads to S3-compatible storage."""

    def __init__(self) -> None:
        self.s3_client = None
        self.bucket_name = settings.S3_BUCKET_NAME
        self.public_url = settings.S3_PUBLIC_URL
        self._init_client()

    def _init_client(self) -> None:
        """Initialize S3 client if credentials are configured."""
        if settings.S3_ENDPOINT_URL and settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY:
            try:
                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.S3_ENDPOINT_URL,
                    aws_access_key_id=settings.S3_ACCESS_KEY,
                    aws_secret_access_key=settings.S3_SECRET_KEY,
                    region_name=settings.S3_REGION,
                )
                logger.info("S3 client initialized successfully")
            except Exception as e:
                logger.warning("Failed to initialize S3 client: %s", e)
                self.s3_client = None
        else:
            logger.info("S3 not configured, using local storage fallback")

    def is_configured(self) -> bool:
        """Check if S3 is properly configured."""
        return self.s3_client is not None

    def validate_upload_file(self, file: UploadFile) -> tuple[bool, str]:
        """Validate uploaded file type and size."""
        # Check file size
        if file.size and file.size > settings.MAX_FILE_SIZE:
            return False, f"File size {file.size} exceeds maximum {settings.MAX_FILE_SIZE} bytes"

        # Check MIME type
        mime = (
            file.content_type
            or mimetypes.guess_type(file.filename or "")[0]
            or "application/octet-stream"
        )
        if mime not in settings.ALLOWED_IMAGE_TYPES:
            return False, f"File type {mime} not allowed. Allowed: {settings.ALLOWED_IMAGE_TYPES}"

        return True, ""

    def generate_object_key(self, property_id: int, filename: str) -> str:
        """Generate unique object key for S3."""
        ext = Path(filename).suffix.lower()
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        return f"properties/{property_id}/{timestamp}_{unique_id}{ext}"

    async def upload_upload_file(
        self,
        file: UploadFile,
        property_id: int,
    ) -> tuple[bool, str | None, str | None]:
        """
        Upload FastAPI UploadFile to S3 or local storage.
        Returns: (success, url, error_message)
        """
        is_valid, error = self.validate_upload_file(file)
        if not is_valid:
            return False, None, error

        object_key = self.generate_object_key(property_id, file.filename or "unknown")

        file_content = await file.read()

        if self.s3_client:
            try:
                import io

                file_obj = io.BytesIO(file_content)
                self.s3_client.upload_fileobj(
                    file_obj,
                    self.bucket_name,
                    object_key,
                    ExtraArgs={
                        "ContentType": (
                            file.content_type
                            or mimetypes.guess_type(file.filename or "")[0]
                            or "application/octet-stream"
                        ),
                        "ACL": "public-read",
                    },
                )
            except ClientError:
                logger.exception("S3 upload failed")
                return False, None, "Upload failed"
            else:
                url = (
                    f"{self.public_url}/{object_key}"
                    if self.public_url
                    else f"{settings.S3_ENDPOINT_URL}/{self.bucket_name}/{object_key}"
                )
                return True, url, None
        else:
            # Local storage fallback
            local_path = Path("uploads") / object_key
            local_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                local_path.write_bytes(file_content)
            except Exception:
                logger.exception("Local upload failed")
                return False, None, "Upload failed"
            else:
                # Return local URL (would need a static file server in production)
                url = f"/uploads/{object_key}"
                return True, url, None

    def upload_file(
        self,
        file: BinaryIO,
        property_id: int,
        filename: str,
        content_type: str | None = None,
    ) -> tuple[bool, str | None, str | None]:
        """
        Upload file to S3 or local storage (legacy binary IO interface).
        Returns: (success, url, error_message)
        """
        is_valid, error = self.validate_file(file, filename, content_type)
        if not is_valid:
            return False, None, error

        object_key = self.generate_object_key(property_id, filename)

        if self.s3_client:
            try:
                self.s3_client.upload_fileobj(
                    file,
                    self.bucket_name,
                    object_key,
                    ExtraArgs={
                        "ContentType": (
                            content_type
                            or mimetypes.guess_type(filename)[0]
                            or "application/octet-stream"
                        ),
                        "ACL": "public-read",
                    },
                )
            except ClientError:
                logger.exception("S3 upload failed")
                return False, None, "Upload failed"
            else:
                url = (
                    f"{self.public_url}/{object_key}"
                    if self.public_url
                    else f"{settings.S3_ENDPOINT_URL}/{self.bucket_name}/{object_key}"
                )
                return True, url, None
        else:
            # Local storage fallback
            local_path = Path("uploads") / object_key
            local_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                file.seek(0)
                local_path.write_bytes(file.read())
            except Exception:
                logger.exception("Local upload failed")
                return False, None, "Upload failed"
            else:
                # Return local URL (would need a static file server in production)
                url = f"/uploads/{object_key}"
                return True, url, None

    def validate_file(
        self, file: BinaryIO, filename: str, content_type: str | None = None
    ) -> tuple[bool, str]:
        """Validate file type and size (legacy binary IO interface)."""
        # Check file size (seek to end, then back)
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)

        if size > settings.MAX_FILE_SIZE:
            return False, f"File size {size} exceeds maximum {settings.MAX_FILE_SIZE} bytes"

        # Check MIME type
        mime = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        if mime not in settings.ALLOWED_IMAGE_TYPES:
            return False, f"File type {mime} not allowed. Allowed: {settings.ALLOWED_IMAGE_TYPES}"

        return True, ""

    def delete_file(self, url: str) -> bool:
        """Delete file from storage."""
        if not self.s3_client:
            return False
        try:
            # Extract object key from URL
            if self.public_url and url.startswith(self.public_url):
                object_key = url[len(self.public_url) + 1 :]
            else:
                object_key = url.split(f"{self.bucket_name}/")[-1]

            self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_key)
        except ClientError:
            logger.exception("S3 delete failed")
            return False
        else:
            return True


# Global instance
upload_service = UploadService()