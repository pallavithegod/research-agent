from dataclasses import dataclass
from datetime import datetime, timezone
from typing import BinaryIO
from uuid import uuid4

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class StoredArtifact:
    key: str
    uri: str
    content_type: str
    size_bytes: int | None = None


class ArtifactStorageService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def is_enabled(self) -> bool:
        return self.settings.artifact_storage_backend == "azure_blob"

    def build_key(self, *, org_id: str, job_id: str, kind: str, extension: str) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%Y/%m/%d")
        safe_extension = extension.lstrip(".") or "bin"
        return f"orgs/{org_id}/jobs/{job_id}/{kind}/{timestamp}/{uuid4().hex}.{safe_extension}"

    def upload_bytes(
        self,
        *,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> StoredArtifact:
        if not self.is_enabled:
            raise RuntimeError("Artifact storage is not enabled.")

        blob_client = self._container_client().get_blob_client(key)
        blob_client.upload_blob(data, overwrite=False, content_type=content_type)
        return StoredArtifact(key=key, uri=blob_client.url, content_type=content_type, size_bytes=len(data))

    def upload_file(
        self,
        *,
        key: str,
        file_obj: BinaryIO,
        content_type: str = "application/octet-stream",
    ) -> StoredArtifact:
        if not self.is_enabled:
            raise RuntimeError("Artifact storage is not enabled.")

        blob_client = self._container_client().get_blob_client(key)
        blob_client.upload_blob(file_obj, overwrite=False, content_type=content_type)
        return StoredArtifact(key=key, uri=blob_client.url, content_type=content_type)

    def _container_client(self):
        if not self.settings.azure_blob_connection_string or not self.settings.azure_blob_container:
            raise RuntimeError("Azure Blob Storage is not configured.")

        from azure.storage.blob import BlobServiceClient

        service = BlobServiceClient.from_connection_string(self.settings.azure_blob_connection_string)
        return service.get_container_client(self.settings.azure_blob_container)


artifact_storage_service = ArtifactStorageService()
