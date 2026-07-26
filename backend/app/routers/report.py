from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.models import Repository
from app.auth import get_current_user
from app.services.report import ReportService
from app.models import User
router = APIRouter(prefix="/repositories/{repo_id}/reports", tags=["reports"])
@router.get("/openapi", response_class=JSONResponse)
def get_openapi_report(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns auto-generated OpenAPI 3.0 specification JSON.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id, Repository.owner_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    service = ReportService(db)
    spec = service.generate_openapi_spec(repo_id)
    return JSONResponse(content=spec)
@router.get("/markdown")
def get_markdown_report(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Downloads technical report as a markdown document.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id, Repository.owner_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    service = ReportService(db)
    md_content = service.generate_markdown_report(repo_id)
    
    headers = {
        "Content-Disposition": f"attachment; filename={repo.name}_api_report.md"
    }
    return Response(content=md_content, media_type="text/markdown", headers=headers)
@router.get("/json", response_class=JSONResponse)
def get_json_report(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns structured technical JSON summary metrics.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id, Repository.owner_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    service = ReportService(db)
    return service.generate_json_report(repo_id)
@router.get("/dependency-graph", response_class=JSONResponse)
def get_dependency_graph(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns graph node elements and directed imports edges map.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id, Repository.owner_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    service = ReportService(db)
    return service.generate_dependency_graph(repo_id)
@router.get("/code-quality", response_class=JSONResponse)
def get_code_quality_report(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates file violations and calculates quality metrics.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id, Repository.owner_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    service = ReportService(db)
    return service.generate_code_quality(repo_id)
@router.get("/pdf", response_class=HTMLResponse)
def get_pdf_report(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns beautifully styled printable HTML representation of the technical document,
    enabling native browser 'Save to PDF' rendering.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id, Repository.owner_id == current_user.id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
    service = ReportService(db)
    md_content = service.generate_markdown_report(repo_id)
    # Convert markdown headers and tables to standard HTML structures
    import re
    html_lines = []
    for line in md_content.split("\n"):
        if line.startswith("# "):
            html_lines.append(f"<h1>{line[2:]}</h1>")
        elif line.startswith("## "):
            html_lines.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("### "):
            html_lines.append(f"<h3>{line[4:]}</h3>")
        elif line.startswith("- "):
            html_lines.append(f"<ul><li>{line[2:]}</li></ul>")
        elif line.startswith("|") and "HTTP Method" not in line and "---" not in line:
            parts = [p.strip() for p in line.split("|")[1:-1]]
            tds = "".join([f"<td>{p}</td>" for p in parts])
            html_lines.append(f"<tr>{tds}</tr>")
        elif line.startswith("|") and "HTTP Method" in line:
            parts = [p.strip() for p in line.split("|")[1:-1]]
            ths = "".join([f"<th>{p}</th>" for p in parts])
            html_lines.append(f"<table><thead><tr>{ths}</tr></thead><tbody>")
        elif line.startswith("---") and len(line) < 10:
            html_lines.append("<hr/>")
        else:
            if "</table>" not in line and line.strip() != "":
                html_lines.append(f"<p>{line}</p>")
    html_body = "\n".join(html_lines)
    # Ensure tables are closed
    table_count = html_body.count("<table>")
    # For every table start, close it appropriately
    html_body = html_body.replace("<h2>", "</tbody></table>\n<h2>").replace("<hr/>", "</tbody></table>\n<hr/>")
    styled_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{repo.name} Technical API Report</title>
        <style>
            body {{
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                color: #1f2937;
                line-height: 1.6;
                max-width: 800px;
                margin: 40px auto;
                padding: 0 20px;
            }}
            h1 {{
                font-size: 2.25rem;
                color: #6d28d9;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
            }}
            h2 {{
                font-size: 1.5rem;
                color: #4b5563;
                margin-top: 32px;
            }}
            h3 {{
                font-size: 1.2rem;
                color: #8b5cf6;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
            }}
            th, td {{
                border: 1px solid #e5e7eb;
                padding: 10px 14px;
                text-align: left;
            }}
            th {{
                background-color: #f9fafb;
                font-weight: 600;
            }}
            tr:nth-child(even) {{
                background-color: #f9fafb;
            }}
            code {{
                font-family: monospace;
                background-color: #f3f4f6;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.9em;
            }}
            blockquote {{
                border-left: 4px solid #8b5cf6;
                background-color: #f5f3ff;
                margin: 0;
                padding: 10px 20px;
                font-style: italic;
            }}
            @media print {{
                body {{
                    margin: 0;
                }}
                button {{
                    display: none;
                }}
            }}
        </style>
    </head>
    <body>
        <div style="text-align: right; margin-bottom: 20px;">
            <button onclick="window.print()" style="background-color: #6d28d9; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 6px; cursor: pointer;">
                Print / Save as PDF
            </button>
        </div>
        {html_body}
    </body>
    </html>
    """
    return HTMLResponse(content=styled_html)