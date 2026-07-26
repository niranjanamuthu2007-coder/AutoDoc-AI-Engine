from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import Optional, List
from app.database import get_db
from app.models import APIEndpoint, Repository
from app.schemas import APIEndpointResponse, APIEndpointListResponse
from app.auth import get_current_user
from app.models import User
router = APIRouter(tags=["endpoints"])
@router.get("/repositories/{repo_id}/endpoints", response_model=APIEndpointListResponse)
def list_repository_endpoints(
    repo_id: int,
    search: Optional[str] = Query(None, description="Search term mapping route paths, docstrings or handlers"),
    method: Optional[str] = Query(None, description="Filter by HTTP Method (e.g. GET, POST)"),
    auth: Optional[bool] = Query(None, description="Filter by auth requirement (true/false)"),
    sort_by: str = Query("route", description="Field to sort by: route, method, file_path, line_number"),
    sort_order: str = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(25, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search, sort, filter and paginate through discovered REST endpoints.
    """
    # Verify owner credentials
    repo = db.query(Repository).filter(Repository.id == repo_id, Repository.owner_id == current_user.id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found or access denied."
        )
    query = db.query(APIEndpoint).filter(APIEndpoint.repository_id == repo_id)
    # 1. Applying Filters
    if method:
        query = query.filter(APIEndpoint.method == method.upper())
    if auth is not None:
        query = query.filter(APIEndpoint.auth == auth)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                APIEndpoint.route.ilike(search_filter),
                APIEndpoint.function_name.ilike(search_filter),
                APIEndpoint.docstring.ilike(search_filter)
            )
        )
    # 2. Applying Sorting
    sort_column = getattr(APIEndpoint, sort_by, APIEndpoint.route)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    # 3. Applying Pagination
    total = query.count()
    pages = (total + per_page - 1) // per_page
    offset = (page - 1) * per_page
    items = query.offset(offset).limit(per_page).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page
    }
@router.get("/endpoints/{endpoint_id}", response_model=APIEndpointResponse)
def get_endpoint_detail(
    endpoint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detailed parameters, docstrings and controller details of a single REST API.
    """
    endpoint = db.query(APIEndpoint).filter(APIEndpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Endpoint not found."
        )
    # Verify repository ownership
    repo = db.query(Repository).filter(
        Repository.id == endpoint.repository_id, 
        Repository.owner_id == current_user.id
    ).first()
    
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to endpoint details is forbidden."
        )
    return endpoint