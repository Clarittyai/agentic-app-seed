"""Per-user file/image storage for this app, brokered by the Claritty platform.

The app never holds S3 credentials. These routes forward to the platform's file
broker (via the SDK's ``claritty_sdk.files``), which validates that the current
user may access THIS app, then mints short-lived presigned S3 URLs scoped to
``{appId}/{userId}/...``. So uploads are private to the app AND to the user.

Browser flow (also dodges the Lambda ~6 MB payload cap — bytes never stream
through the app):
  1. POST /api/files/upload-url  → { fileId, uploadUrl, contentType }
  2. Browser PUTs the file straight to `uploadUrl` (exact Content-Type, no auth)
  3. POST /api/files/{fileId}/confirm
  4. GET  /api/files/{fileId}/url → a fresh short-lived presigned GET for display

backend/main.py auto-includes `router`.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.security import require_user

logger = logging.getLogger(__name__)

router = APIRouter()


class _UploadUrlReq(BaseModel):
    filename: str
    contentType: str
    sizeBytes: Optional[int] = None


def _broker():
    """The SDK file broker, or a 503 when it isn't available (bare local dev)."""
    try:
        from claritty_sdk import files  # imported lazily so bare seed dev still boots
        from claritty_sdk.files import FileBrokerError

        return files, FileBrokerError
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail="File storage isn't available in this environment.",
        ) from exc


def _guard(err_cls):
    """Map a FileBrokerError to a clean HTTP error (never leak internals)."""

    def wrap(fn):
        try:
            return fn()
        except err_cls as exc:  # noqa: BLE001
            msg = str(exc)
            # The broker raises this exact text on a cross-(app|user) denial.
            status = 403 if "does not have access" in msg else 502
            logger.warning("file broker error: %s", msg)
            raise HTTPException(status_code=status, detail="Could not complete that file action.")

    return wrap


@router.post("/api/files/upload-url")
def create_upload_url(req: _UploadUrlReq, user_id: str = Depends(require_user)) -> Dict[str, Any]:
    files, err = _broker()
    return _guard(err)(
        lambda: files.create_upload_url(
            req.filename, req.contentType, user_id, size_bytes=req.sizeBytes
        )
    )


@router.post("/api/files/{file_id}/confirm")
def confirm(file_id: str, user_id: str = Depends(require_user)) -> Dict[str, Any]:
    files, err = _broker()
    return _guard(err)(lambda: files.confirm(file_id, user_id))


@router.get("/api/files")
def list_files(user_id: str = Depends(require_user)) -> Dict[str, Any]:
    files, err = _broker()
    return {"files": _guard(err)(lambda: files.list_files(user_id))}


@router.get("/api/files/{file_id}/url")
def download_url(file_id: str, user_id: str = Depends(require_user)) -> Dict[str, Any]:
    files, err = _broker()
    return _guard(err)(lambda: files.download_url(file_id, user_id))


@router.delete("/api/files/{file_id}")
def delete_file(file_id: str, user_id: str = Depends(require_user)) -> Dict[str, Any]:
    files, err = _broker()
    return _guard(err)(lambda: files.delete(file_id, user_id))
