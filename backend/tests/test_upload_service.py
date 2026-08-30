"""Tests for the file upload service (GCS / S3 / local + server-side compression)."""

import asyncio
import io
from typing import TYPE_CHECKING

import pytest
from PIL import Image

from app.services.upload_service import UploadService, _process_photo

if TYPE_CHECKING:  # pragma: no cover
    from fastapi import UploadFile


def _make_png(size=(3000, 2000), mode="RGB") -> bytes:
    """Build a large PNG so compression actually shrinks it."""
    buf = io.BytesIO()
    img = Image.new(mode, size, (200, 40, 80))
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestProcessPhoto:
    """Server-side compression: EXIF, resize, JPEG re-encode."""

    def test_downscales_and_reencodes(self):
        raw = _make_png()
        processed = _process_photo(raw)
        assert processed != raw
        assert len(processed) < len(raw)

        img = Image.open(io.BytesIO(processed))
        assert img.format == "JPEG"
        assert max(img.size) <= 1600  # PHOTO_MAX_DIMENSION

    def test_transparency_filled_white(self):
        raw = _make_png(mode="RGBA")
        processed = _process_photo(raw)
        img = Image.open(io.BytesIO(processed))
        assert img.mode == "RGB"


class TestUploadServiceSelection:
    """Backend selection at import time."""

    def test_service_instantiates(self):
        svc = UploadService()
        assert svc.backend_name in ("gcs", "s3", "local")
        # In CI / local tests without cloud creds it must fall back to local.
        assert callable(svc.upload_file)

    def test_object_keys_are_namespaced_and_unique(self):
        svc = UploadService()
        k1 = svc.generate_object_key(42)
        k2 = svc.generate_object_key(42)
        assert k1.startswith("properties/42/")
        assert k1.endswith(".jpg")
        assert k1 != k2


class TestUploadServiceLocal:
    """Local backend path (no cloud credentials in unit tests)."""

    @pytest.fixture(autouse=True)
    def force_local(self, monkeypatch, tmp_path):
        monkeypatch.setattr("app.core.config.settings.GCS_BUCKET_NAME", "")
        monkeypatch.setattr("app.core.config.settings.GCS_PUBLIC_URL", "")
        monkeypatch.setattr("app.core.config.settings.S3_ENDPOINT_URL", "")
        monkeypatch.setattr("app.core.config.settings.S3_ACCESS_KEY", "")
        monkeypatch.setattr("app.core.config.settings.S3_SECRET_KEY", "")
        monkeypatch.setattr("app.core.config.settings.UPLOAD_DIR", str(tmp_path))

    @staticmethod
    def _upload(content: bytes, filename: str) -> "UploadFile":
        from fastapi import UploadFile

        return UploadFile(
            file=io.BytesIO(content),
            filename=filename,
            headers={"content-type": "image/png"},
        )

    def test_upload_upload_file_writes_and_returns_url(self):
        svc = UploadService()
        assert svc.backend_name == "local"

        upload = self._upload(_make_png(), "photo.png")
        success, url, error = asyncio.run(svc.upload_upload_file(upload, 7))
        assert success is True, error
        assert error is None
        assert url and url.startswith("/uploads/properties/7/")
        assert url.endswith(".jpg")  # compressed to JPEG

    def test_rejects_non_image(self):
        svc = UploadService()
        from fastapi import UploadFile

        upload = UploadFile(
            file=io.BytesIO(b"hello"),
            filename="note.txt",
            headers={"content-type": "text/plain"},
        )
        success, _url, error = asyncio.run(svc.upload_upload_file(upload, 1))
        assert success is False
        assert "not allowed" in (error or "")

    def test_delete_file(self):
        svc = UploadService()
        upload = self._upload(_make_png(), "photo.png")
        success, url, _ = asyncio.run(svc.upload_upload_file(upload, 9))
        assert success and url
        assert svc.delete_file(url) is True
        # Second delete: file already gone -> False
        assert svc.delete_file(url) is False


class TestKeyFromUrl:
    """Extract object key from various public URL shapes."""

    def test_gcs_url(self):
        svc = UploadService()
        svc.gcs_bucket = type("B", (), {"name": "beldomik-photos"})()
        key = svc._key_from_url(
            "https://storage.googleapis.com/beldomik-photos/properties/3/abc.jpg"
        )
        assert key == "properties/3/abc.jpg"

    def test_local_url(self):
        svc = UploadService()
        assert svc._key_from_url("/uploads/properties/1/xyz.jpg") == "properties/1/xyz.jpg"

    def test_unknown_url(self):
        svc = UploadService()
        assert svc._key_from_url("https://example.com/x.jpg") is None
