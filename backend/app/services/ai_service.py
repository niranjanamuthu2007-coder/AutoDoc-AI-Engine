import json
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from app.config import settings
from app.models import APIEndpoint, Repository, RepositoryFile
class AIService:
    def __init__(self, db: Session):
        self.db = db
    async def get_repository_context(self, repo_id: int) -> str:
        """
        Retrieves repository statistics and endpoint lists to feed into Gemini prompt context.
        """
        repo = self.db.query(Repository).filter(Repository.id == repo_id).first()
        if not repo:
            return "No repository found."
        endpoints = self.db.query(APIEndpoint).filter(APIEndpoint.repository_id == repo_id).all()
        
        context = []
        context.append(f"Repository Name: {repo.name}")
        context.append(f"Framework: {repo.framework.upper() if repo.framework else 'Unknown'}")
        context.append(f"Total Files: {repo.total_files}")
        context.append(f"Total Discovered REST APIs: {len(endpoints)}")
        
        context.append("\nDiscovered Endpoints list:")
        for ep in endpoints:
            auth_str = "Requires Authentication" if ep.auth else "Public"
            params_str = json.dumps(ep.parameters) if ep.parameters else "None"
            context.append(
                f"- Route: {ep.route} | Method: {ep.method} | Function: {ep.function_name} | "
                f"Location: {ep.file_path} (Line {ep.line_number}) | Auth: {auth_str} | Parameters: {params_str}"
            )
            if ep.docstring:
                context.append(f"  Docstring: {ep.docstring.strip()}")
        return "\n".join(context)
    async def ask_gemini(self, prompt: str, repo_id: int, history: List[Dict[str, str]] = []) -> str:
        """
        Queries Gemini with repository context.
        Falls back to local QA generator if no GEMINI_API_KEY is found.
        """
        repo = self.db.query(Repository).filter(Repository.id == repo_id).first()
        repo_context = await self.get_repository_context(repo_id)
        system_instruction = (
            "You are AutoDoc AI, an expert source code analysis assistant. "
            "Your task is to analyze, explain, and write documentation for the uploaded repository. "
            "You MUST ONLY answer questions regarding the provided repository. "
            "If a question is unrelated to the codebase, politely refuse to answer. "
            "Always include file links and function references where possible.\n\n"
            f"Here is the context of the analyzed repository:\n{repo_context}"
        )
        if not settings.GEMINI_API_KEY:
            return self._generate_mock_response(prompt, repo, repo_context)
        # Build message history for Gemini API structure
        contents = []
        # Add system instruction as part of prompt or as system_instruction query parameter
        # We can add historical messages
        for msg in history:
            contents.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [{"text": msg["content"]}]
            })
            
        # Add current user prompt
        contents.append({
            "role": "user",
            "parts": [{"text": f"System Guidelines: {system_instruction}\n\nUser Question: {prompt}"}]
        })
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 2048,
                }
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=30.0)
                if resp.status_code == 200:
                    data = resp.json()
                    # Extract response text
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    return f"Gemini API Error (Status {resp.status_code}): {resp.text}"
        except Exception as e:
            return f"Failed to connect to Gemini service: {str(e)}. (Local Mock Mode is active if you remove the key)."
    def _generate_mock_response(self, prompt: str, repo: Repository, context: str) -> str:
        """
        Generates realistic, context-aware mock responses based on repository structures.
        """
        p_lower = prompt.lower()
        endpoints = self.db.query(APIEndpoint).filter(APIEndpoint.repository_id == repo.id).all()
        
        if "readme" in p_lower or "generate readme" in p_lower:
            # Generate a gorgeous README file
            routes_md = ""
            for ep in endpoints:
                routes_md += f"| `{ep.method}` | `{ep.route}` | `{ep.function_name}` | {'🔒 Yes' if ep.auth else '🔓 No'} |\n"
            return f"""# {repo.name}
AI-generated README for your {repo.framework.upper() if repo.framework else 'Python'} codebase.
## Overview
This repository contains a `{repo.framework if repo.framework else 'Python'}` REST API platform containing `{repo.total_files}` files and `{len(endpoints)}` discovered endpoints.
## Discovered API Endpoints
| Method | Path | Controller / Function | Requires Auth |
| :--- | :--- | :--- | :--- |
{routes_md or '| - | - | - | - |'}
## Setup Instructions
1. Clone or extract this repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run application server:
   ```bash
   # Run command based on framework
   {"uvicorn main:app --reload" if repo.framework == "fastapi" else "flask run" if repo.framework == "flask" else "python manage.py runserver"}
   ```
"""
        elif "auth" in p_lower or "security" in p_lower:
            auth_endpoints = [ep for ep in endpoints if ep.auth]
            auth_routes = ", ".join([f"`{e.method} {e.route}`" for e in auth_endpoints])
            
            return f"""### Authentication Flow Analysis
The repository uses `{repo.framework.upper() if repo.framework else 'Python'}` configuration.
- **Security Check Status**: **{"Secured" if auth_endpoints else "Public / No Explicit JWT guards detected"}**.
- **Protected Endpoints**: {auth_routes or "None explicitly detected via static analysis dependency check."}
#### Technical Details
Typically, authentication is handled in this codebase via:
1. **FastAPI**: Custom dependency injection using `Depends(...)` mapping tokens, such as decoding JWTs from the HTTP Bearer header.
2. **Django REST Framework**: Custom backend classes listed under `permission_classes = [IsAuthenticated]`.
3. **Flask**: Decorator wrappers like `@login_required` protecting routes.
"""
        elif "architecture" in p_lower or "structure" in p_lower:
            return f"""### Architectural Explanation
This codebase represents a modular REST API application designed using a **{repo.framework.upper() if repo.framework else 'standard Python'}** architecture.
#### Project Topology
- **API Interfaces**: Endpoints mapped directly to routers and files.
- **Routing**: Setup via framework-native routes (e.g. `APIRouter` for FastAPI, `Blueprint` for Flask, or ViewSets in Django).
- **Data Models**: Relational schemas mapped through ORM patterns.
#### Dependencies Layout
The dependency architecture is composed of core framework packages coupled with standard utility libraries for processing JSON, validation (Pydantic), and database connectivity (SQLAlchemy).
"""
        # General summary
        routes_summary = ", ".join([f"`{e.method} {e.route}`" for e in endpoints[:5]])
        if len(endpoints) > 5:
            routes_summary += f" and {len(endpoints) - 5} more endpoints"
        return f"""### AutoDoc Platform Summary
Hello! I have completed analyzing **{repo.name}**. Here are some key discoveries:
- **Framework**: `{repo.framework.upper() if repo.framework else 'Unknown'}`
- **Source Files**: `{repo.total_files}` Python modules
- **Endpoints Detected**: `{len(endpoints)}` REST APIs
- **Core Endpoints**: {routes_summary or "None discovered"}
You can ask me to:
1. **Generate a README** for this project.
2. **Explain the Authentication** flow.
3. **Explain the architecture** and module layout.
4. **Explain a specific route** (e.g. explain `/api/endpoint`).
"""