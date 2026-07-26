import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from app.config import settings
class StorageService:
    @staticmethod
    def save_upload_file(upload_file: UploadFile) -> str:
        """
        Saves uploaded file onto storage/uploads/ with unique identifier.
        """
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Generate safe filename
        ext = Path(upload_file.filename).suffix
        if ext.lower() != ".zip":
            raise ValueError("Only ZIP archive uploads are supported.")
        unique_filename = f"{uuid.uuid4()}{ext}"
        target_path = Path(settings.UPLOAD_DIR) / unique_filename
        with open(target_path, "wb") as buffer:
            # Chunked writing to prevent memory blowouts on large uploads
            while chunk := upload_file.file.read(8192):
                buffer.write(chunk)
        return str(target_path)
    @staticmethod
    def delete_file(filepath: str):
        """
        Removes file if it exists.
        """
        path = Path(filepath)
        if path.exists() and path.is_file():
            try:
                os.remove(path)
            except Exception:
                pass
                
    @staticmethod
    def delete_repo_temp_folder(repo_id: int):
        """
        Cleans up temporary workspace.
        """
        temp_path = Path(settings.TEMP_DIR) / f"repo_{repo_id}"
        if temp_path.exists() and temp_path.is_dir():
            try:
                import shutil
                shutil.rmtree(temp_path)
            except Exception:
                pass