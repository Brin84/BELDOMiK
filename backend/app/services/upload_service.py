"""File upload service — photo storage for property listings.

Backend selection (once at import, matching baraholka's approach):

1. Google Cloud Storage (GCS) — used in production on Cloud Run. The runtime
   service account is authenticated via ADC (metadata server), no keys needed.
   Bucket has uniform access with public objectViewer, so stored keys are
   publicly readable at https://storage.googleapis.com/{bucket}/{key}.
2. S3-compatible storage (Cloudflare R2 / AWS S3) — when GCS creds absent but
   S3_ENDPOINT_URL/S3_ACCESS_KEY/S3_SECRET_KEY are configured.
3. Local disk fallback (UPLOAD_DIR, served at /uploads) — dev mode.

Every photo is re-encoded server-side before storage: EXIF-orientation is
applied, image resized to PHOTO_MAX_DIMENSION and re-encoded as JPEG at
PHOTO_QUALITY (same approach as baraholka). This keeps stored photos ~300KB
instead of several MB.
"""

import io
import logging
import mimetypes
import uuid
from pathlib import Path
from typing import BinaryIO

from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)

try:  # PIL is a hard dependency; guard so imports never break the app
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    Image = None  # type: ignore[assignment]
    ImageOps = None  # type: ignore[assignment]


def _process_photo(content: bytes) -> bytes:
    """Downscale + re-encode an image to JPEG (EXIF-aware).

    Mirrors baraholka's _process_photo. Raises on broken/malformed input so
    the caller can fall back to storing the original bytes.
    """
    img = Image.open(io.BytesIO(content))
    # Apply EXIF orientation: camera shots store rotation in metadata, without
    # this the photo renders rotated after re-encoding to JPEG.
    img = ImageOps.exif_transpose(img)
    img.thumbnail(
        (settings.PHOTO_MAX_DIMENSION, settings.PHOTO_MAX_DIMENSION),
        Image.Resampling.LANCZOS,
    )
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        # Transparency filled with white — clean background for photos
        rgba = img.convert("RGBA")
        bg = Image.new("RGB", rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=settings.PHOTO_QUALITY, optimize=True)
    return out.getvalue()


class UploadService:
    """Handles file uploads to GCS / S3-compatible storage / local disk."""

    def __init__(self) -> None:
        self.bucket_name = settings.S3_BUCKET_NAME
        self.public_url = settings.S3_PUBLIC_URL
        self.s3_client = None
        self.gcs_bucket = None
        self._backend_name = "local"
        self._init_backends()

    def _init_backends(self) -> None:
        """Initialize GCS first (cloud), then S3, keep local as fallback."""
        # --- GCS (production on Cloud Run via ADC) ---
        if settings.GCS_BUCKET_NAME:
            try:
                from google.cloud import storage  # type: ignore[import-not-found]

                client = storage.Client()  # uses ADC (Cloud Run service account / gcloud)
                self.gcs_bucket = client.bucket(settings.GCS_BUCKET_NAME)
                # Force a metadata round-trip to fail fast if the bucket or
                # credentials are not actually available.
                self.gcs_bucket.exists()
                self._backend_name = "gcs"
                logger.info("Upload storage: GCS bucket %s", settings.GCS_BUCKET_NAME)
            except Exception as exc:
                logger.warning("GCS unavailable (%s); falling back", exc)
                self.gcs_bucket = None

        # --- S3-compatible (R2 / AWS S3) ---
        if self.gcs_bucket is None and (
            settings.S3_ENDPOINT_URL and settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY
        ):
            try:
                import boto3

                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.S3_ENDPOINT_URL,
                    aws_access_key_id=settings.S3_ACCESS_KEY,
                    aws_secret_access_key=settings.S3_SECRET_KEY,
                    region_name=settings.S3_REGION,
                )
                self._backend_name = "s3"
                logger.info("Upload storage: S3 bucket %s", self.bucket_name)
            except Exception as exc:
                logger.warning("Failed to init S3 client: %s", exc)
                self.s3_client = None

        if self._backend_name == "local":
            logger.info("Upload storage: local disk (%s)", settings.UPLOAD_DIR)

    @property
    def backend_name(self) -> str:
        """Active backend: gcs | s3 | local."""
        return self._backend_name

    def is_configured(self) -> bool:
        """True when a cloud backend (GCS/S3) is active."""
        return self._backend_name in ("gcs", "s3")

    def validate_upload_file(self, file: UploadFile) -> tuple[bool, str]:
        """Validate uploaded file type and size."""
        if file.size and file.size > settings.MAX_FILE_SIZE:
            mb = settings.MAX_FILE_SIZE // (1024 * 1024)
            return False, f"File size exceeds maximum {mb}MB"

        mime = (
            file.content_type
            or mimetypes.guess_type(file.filename or "")[0]
            or "application/octet-stream"
        )
        if mime not in settings.ALLOWED_IMAGE_TYPES:
            return False, f"File type {mime} not allowed. Allowed: {settings.ALLOWED_IMAGE_TYPES}"

        return True, ""

    def generate_object_key(self, property_id: int, ext: str = "jpg") -> str:
        """Generate a unique object key: properties/{property_id}/{uuid}.{ext}."""
        unique_id = uuid.uuid4().hex
        return f"properties/{property_id}/{unique_id}.{ext}"

    async def upload_upload_file(
        self,
        file: UploadFile,
        property_id: int,
    ) -> tuple[bool, str | None, str | None]:
        """
        Upload a FastAPI UploadFile (image) to the active backend.
        Returns: (success, url, error_message). Photo is re-encoded server-side.
        """
        is_valid, error = self.validate_upload_file(file)
        if not is_valid:
            return False, None, error

        raw = await file.read()
        if not raw:
            return False, None, "Empty file"

        # Server-side compression; fall back to original bytes on malformed input
        try:
            processed = _process_photo(raw)
        except Exception:
            logger.exception("Photo processing failed; storing original")
            processed = raw
            ext = self._ext_from_mime(file.content_type, file.filename)
            content_type = file.content_type or "image/jpeg"
        else:
            ext = "jpg"
            content_type = "image/jpeg"

        object_key = self.generate_object_key(property_id, ext)

        if self._backend_name == "gcs":
            try:
                blob = self.gcs_bucket.blob(object_key)
                blob.upload_from_string(
                    processed,
                    content_type=content_type,
                )
                # Uniform access: no per-object ACL needed; allUsers.objectViewer
                # on the bucket already grants public reads.
                blob.cache_control = "public, max-age=31536000, immutable"
                blob.patch()
            except Exception:
                logger.exception("GCS upload failed")
                return False, None, "Upload failed"
            else:
                url = f"{settings.GCS_PUBLIC_URL.rstrip('/')}/{self.gcs_bucket.name}/{object_key}"
                return True, url, None

        if self._backend_name == "s3":
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=object_key,
                    Body=processed,
                    ContentType=content_type,
                    # uuid filenames never change — cache forever
                    CacheControl="public, max-age=31536000, immutable",
                    ACL="public-read",
                )
            except Exception:
                logger.exception("S3 upload failed")
                return False, None, "Upload failed"
            else:
                url = (
                    f"{self.public_url.rstrip('/')}/{object_key}"
                    if self.public_url
                    else f"{settings.S3_ENDPOINT_URL}/{self.bucket_name}/{object_key}"
                )
                return True, url, None

        # Local fallback
        local_path = Path(settings.UPLOAD_DIR) / object_key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            local_path.write_bytes(processed)
        except Exception:
            logger.exception("Local upload failed")
            return False, None, "Upload failed"
        else:
            return True, f"/uploads/{object_key}", None

    def upload_file(
        self,
        file: BinaryIO,
        property_id: int,
        filename: str,
        content_type: str | None = None,
    ) -> tuple[bool, str | None, str | None]:
        """Upload a binary file (legacy interface). Returns (success, url, error)."""
        is_valid, error = self.validate_file(file, filename, content_type)
        if not is_valid:
            return False, None, error

        content = file.read()
        try:
            processed = _process_photo(content)
            ext = "jpg"
            content_type = "image/jpeg"
        except Exception:
            logger.exception("Photo processing failed; storing original")
            processed = content
            ext = self._ext_from_mime(content_type, filename)

        object_key = self.generate_object_key(property_id, ext)

        if self._backend_name == "gcs":
            try:
                blob = self.gcs_bucket.blob(object_key)
                blob.upload_from_string(processed, content_type=content_type)
                blob.cache_control = "public, max-age=31536000, immutable"
                blob.patch()
            except Exception:
                logger.exception("GCS upload failed")
                return False, None, "Upload failed"
            else:
                url = f"{settings.GCS_PUBLIC_URL.rstrip('/')}/{self.gcs_bucket.name}/{object_key}"
                return True, url, None

        if self._backend_name == "s3":
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=object_key,
                    Body=processed,
                    ContentType=content_type or "image/jpeg",
                    CacheControl="public, max-age=31536000, immutable",
                    ACL="public-read",
                )
            except Exception:
                logger.exception("S3 upload failed")
                return False, None, "Upload failed"
            else:
                url = (
                    f"{self.public_url.rstrip('/')}/{object_key}"
                    if self.public_url
                    else f"{settings.S3_ENDPOINT_URL}/{self.bucket_name}/{object_key}"
                )
                return True, url, None

        local_path = Path(settings.UPLOAD_DIR) / object_key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            local_path.write_bytes(processed)
        except Exception:
            logger.exception("Local upload failed")
            return False, None, "Upload failed"
        else:
            return True, f"/uploads/{object_key}", None

    def validate_file(
        self, file: BinaryIO, filename: str, content_type: str | None = None
    ) -> tuple[bool, str]:
        """Validate file type and size (legacy binary IO interface)."""
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)

        if size > settings.MAX_FILE_SIZE:
            mb = settings.MAX_FILE_SIZE // (1024 * 1024)
            return False, f"File size exceeds maximum {mb}MB"

        mime = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        if mime not in settings.ALLOWED_IMAGE_TYPES:
            return False, f"File type {mime} not allowed. Allowed: {settings.ALLOWED_IMAGE_TYPES}"

        return True, ""

    def delete_file(self, url: str) -> bool:
        """Delete a file from the active backend. Returns True on success."""
        object_key = self._key_from_url(url)
        if not object_key:
            return False

        if self._backend_name == "gcs":
            try:
                self.gcs_bucket.blob(object_key).delete()
            except Exception:
                logger.exception("GCS delete failed")
                return False
            return True

        if self._backend_name == "s3":
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_key)
            except Exception:
                logger.exception("S3 delete failed")
                return False
            return True

        # Local
        local_path = Path(settings.UPLOAD_DIR) / object_key
        try:
            local_path.unlink()
        except FileNotFoundError:
            return False
        except Exception:
            logger.exception("Local delete failed")
            return False
        return True

    def _key_from_url(self, url: str) -> str | None:
        """Extract object key from a stored public URL."""
        if url.startswith("/uploads/"):
            return url[len("/uploads/") :]

        if self.gcs_bucket is not None:
            base = settings.GCS_PUBLIC_URL.rstrip("/")
            prefix = f"{self.gcs_bucket.name}/"
            if url.startswith(base + "/") and url[len(base) + 1 :].startswith(prefix):
                return url[len(base) + 1 + len(prefix) :]

        if self.public_url:
            base = self.public_url.rstrip("/")
            if url.startswith(base + "/"):
                return url[len(base) + 1 :]
        return None

    @staticmethod
    def _ext_from_mime(content_type: str | None, filename: str | None) -> str:
        """Extension for the case where compression failed and we store original."""
        if content_type:
            if content_type == "image/png":
                return "png"
            if content_type == "image/webp":
                return "webp"
            if content_type == "image/avif":
                return "avif"
        ext = (filename or "").split(".")[-1].lower()
        return ext if ext in {"jpg", "jpeg", "png", "webp", "avif"} else "jpg"


# Global instance (one per process)
upload_service = UploadService()
