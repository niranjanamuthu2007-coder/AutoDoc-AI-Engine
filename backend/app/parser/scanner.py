import os
import zipfile
import shutil
import ast
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Repository, RepositoryFile, APIEndpoint, AnalysisHistory
from app.parser.fastapi_p import FastAPIParser
from app.parser.flask_p import FlaskParser
from app.parser.django_p import DjangoParser
class RepositoryScanner:
    def __init__(self, db: Session, repo_id: int):
        self.db = db
        self.repo_id = repo_id
        self.repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not self.repo:
            raise ValueError(f"Repository with ID {repo_id} not found in database.")
        self.extracted_path = Path(settings.TEMP_DIR) / f"repo_{repo_id}"
        self.fastapi_parser = FastAPIParser()
        self.flask_parser = FlaskParser()
        self.django_parser = DjangoParser()
    def safe_extract_zip(self) -> Tuple[int, int]:
        """
        Safely extracts the repository ZIP file.
        Checks for:
          - Path traversal (Zip Slip vulnerability)
          - Executable/malicious files
          - Size limits (Max 500MB uncompressed)
        Returns:
          Tuple[total_files, total_size_bytes]
        """
        zip_path = Path(self.repo.filepath)
        if not zip_path.exists():
            raise FileNotFoundError(f"Repository archive not found at {zip_path}")
        # Ensure extraction path is empty
        if self.extracted_path.exists():
            shutil.rmtree(self.extracted_path)
        os.makedirs(self.extracted_path, exist_ok=True)
        total_files = 0
        total_size = 0
        MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024 # 500 MB
        DANGEROUS_EXTENSIONS = {".exe", ".bat", ".sh", ".cmd", ".dll", ".so", ".bin", ".elf"}
        with zipfile.ZipFile(zip_path, 'r') as ref:
            # First pass: dry-run path resolution and size aggregation
            for member in ref.infolist():
                # Protect against Zip Slip (Path Traversal)
                # Ensure resolved path stays inside our target destination
                target_path = Path(os.path.abspath(os.path.join(self.extracted_path, member.filename)))
                if not target_path.resolve().is_relative_to(self.extracted_path.resolve()):
                    raise PermissionError(f"Attempted path traversal in ZIP archive: {member.filename}")
                # Reject executable/dangerous files
                suffix = target_path.suffix.lower()
                if suffix in DANGEROUS_EXTENSIONS:
                    raise ValueError(f"ZIP contains blocked executable/binary file: {member.filename}")
                total_size += member.file_size
                if not member.is_dir():
                    total_files += 1
                if total_size > MAX_UNCOMPRESSED_SIZE:
                    raise ValueError("ZIP archive exceeds safe uncompressed size limit of 500MB (potential zip bomb).")
            # Second pass: execute safe extraction
            ref.extractall(self.extracted_path)
        return total_files, total_size
    def detect_framework(self) -> str:
        """
        Detects Python web frameworks by analyzing source codes imports.
        Matches against fastapi, flask, django.
        """
        framework_scores = {"fastapi": 0, "flask": 0, "django": 0}
        # Check file listings
        for root, _, files in os.walk(self.extracted_path):
            for file in files:
                file_path = Path(root) / file
                
                # Direct file name signatures
                if file == "manage.py":
                    framework_scores["django"] += 10
                
                if file_path.suffix == ".py":
                    try:
                        content = file_path.read_text(errors="ignore")
                        # Simple AST/Regex scanner for import names
                        if "import fastapi" in content or "from fastapi" in content:
                            framework_scores["fastapi"] += 5
                        if "import flask" in content or "from flask" in content:
                            framework_scores["flask"] += 5
                        if "django.db" in content or "rest_framework" in content:
                            framework_scores["django"] += 5
                    except Exception:
                        pass
        # Select highest score framework, default to unknown
        highest_score = 0
        detected = "unknown"
        for fw, score in framework_scores.items():
            if score > highest_score:
                highest_score = score
                detected = fw
        return detected
    def compute_languages(self) -> Dict[str, float]:
        """
        Computes code language distribution percentage.
        """
        extensions_size = {}
        total_python_bytes = 0
        total_other_bytes = 0
        lang_mapping = {
            ".py": "Python",
            ".html": "HTML",
            ".css": "CSS",
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".json": "JSON",
            ".md": "Markdown",
            ".yml": "YAML",
            ".yaml": "YAML"
        }
        for root, _, files in os.walk(self.extracted_path):
            for file in files:
                file_path = Path(root) / file
                suffix = file_path.suffix.lower()
                size = file_path.stat().st_size
                
                lang_name = lang_mapping.get(suffix, "Other")
                extensions_size[lang_name] = extensions_size.get(lang_name, 0) + size
        total_bytes = sum(extensions_size.values())
        if total_bytes == 0:
            return {"Python": 100.0}
        distribution = {}
        for lang, size in extensions_size.items():
            distribution[lang] = round((size / total_bytes) * 100, 2)
        return distribution
    def scan_and_parse(self) -> Dict[str, Any]:
        """
        Orchestrates safe extraction, framework detection, AST scanning, 
        and database storage.
        """
        start_time = os.times().elapsed
        # 1. Safely extract files
        total_files, total_size = self.safe_extract_zip()
        self.repo.total_files = total_files
        self.repo.size = total_size
        # 2. Detect framework
        framework = self.detect_framework()
        self.repo.framework = framework
        self.db.commit()
        # 3. Store file contents and run framework-specific AST parsers
        discovered_endpoints = []
        
        # Phase A: If Django is detected, pre-parse urls.py files to build route bindings
        if framework == "django":
            for root, _, files in os.walk(self.extracted_path):
                for file in files:
                    if file == "urls.py":
                        file_path = Path(root) / file
                        try:
                            code_content = file_path.read_text(encoding="utf-8", errors="ignore")
                            self.django_parser.parse_urls_file(code_content)
                        except Exception:
                            pass
        # Phase B: Parse every file
        for root, _, files in os.walk(self.extracted_path):
            for file in files:
                file_path = Path(root) / file
                relative_path = os.path.relpath(file_path, self.extracted_path)
                
                # Check for Python files
                if file_path.suffix == ".py":
                    try:
                        code_content = file_path.read_text(encoding="utf-8", errors="ignore")
                        
                        # Store file mapping in db
                        repo_file = RepositoryFile(
                            repository_id=self.repo_id,
                            filepath=relative_path,
                            content=code_content
                        )
                        self.db.add(repo_file)
                        self.db.flush()
                        # Parse using framework parser
                        file_endpoints = []
                        module_name = relative_path.replace(os.sep, ".").replace(".py", "")
                        if framework == "fastapi":
                            file_endpoints = self.fastapi_parser.parse_file(relative_path, code_content, module_name)
                        elif framework == "flask":
                            file_endpoints = self.flask_parser.parse_file(relative_path, code_content, module_name)
                        elif framework == "django":
                            file_endpoints = self.django_parser.parse_file(relative_path, code_content, module_name)
                        else:
                            # Fallback: try FastAPI visitor since it handles standard Python routing decorators
                            file_endpoints = self.fastapi_parser.parse_file(relative_path, code_content, module_name)
                            if not file_endpoints:
                                file_endpoints = self.flask_parser.parse_file(relative_path, code_content, module_name)
                        # Standardize endpoints structure and store in DB
                        for ep in file_endpoints:
                            db_ep = APIEndpoint(
                                repository_id=self.repo_id,
                                route=ep["route"],
                                method=ep["method"],
                                function_name=ep["function_name"],
                                parameters=ep["parameters"],
                                return_type=ep["return_type"],
                                response_model=ep["response_model"],
                                status_code=ep["status_code"],
                                tags=ep["tags"],
                                docstring=ep["docstring"],
                                file_path=ep["file_path"],
                                line_number=ep["line_number"],
                                module_name=ep["module_name"],
                                dependencies=ep["dependencies"],
                                auth=ep["auth"]
                            )
                            self.db.add(db_ep)
                            discovered_endpoints.append(ep)
                    except Exception as e:
                        # Resilient parsing: catch and log error, keep parsing remaining files
                        print(f"Failed parsing file {relative_path}: {str(e)}")
        self.db.commit()
        duration = (os.times().elapsed - start_time) * 1000.0
        
        # 4. Save analysis history
        history = AnalysisHistory(
            repository_id=self.repo_id,
            framework_detected=framework,
            total_files=total_files,
            total_endpoints=len(discovered_endpoints),
            duration_ms=duration,
            status="success"
        )
        self.db.add(history)
        self.db.commit()
        # Clean extraction folders to save local disc space
        try:
            shutil.rmtree(self.extracted_path)
        except Exception:
            pass
        return {
            "framework": framework,
            "total_files": total_files,
            "endpoints_discovered": len(discovered_endpoints)
        }