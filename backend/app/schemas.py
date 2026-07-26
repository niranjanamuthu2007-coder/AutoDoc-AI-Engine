from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
# Authentication Schemas
class GoogleLoginRequest(BaseModel):
    credential: str
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
class UserProfile(BaseModel):
    id: int
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
# Repository Schemas
class RepositoryBase(BaseModel):
    name: str
class RepositoryCreate(RepositoryBase):
    pass
class RepositoryResponse(RepositoryBase):
    id: int
    filepath: str
    framework: Optional[str] = None
    total_files: int
    size: int
    created_at: datetime
    owner_id: int
    class Config:
        from_attributes = True
class RepositoryStats(BaseModel):
    framework: str
    total_files: int
    size_bytes: int
    total_endpoints: int
    get_count: int
    post_count: int
    other_methods_count: int
    languages: Dict[str, float] # e.g. {"Python": 98.5, "HTML": 1.5}
# API Endpoint Schemas
class APIEndpointParameter(BaseModel):
    name: str
    type: Optional[str] = None
    required: bool = True
    default: Optional[str] = None
    location: str = "query" # query, path, body, header, cookie
class APIEndpointResponse(BaseModel):
    id: int
    repository_id: int
    route: str
    method: str
    function_name: str
    parameters: Optional[List[Dict[str, Any]]] = None
    return_type: Optional[str] = None
    response_model: Optional[str] = None
    status_code: Optional[int] = 200
    tags: Optional[List[str]] = None
    docstring: Optional[str] = None
    file_path: str
    line_number: Optional[int] = None
    module_name: Optional[str] = None
    dependencies: Optional[List[str]] = None
    auth: bool = False
    created_at: datetime
    class Config:
        from_attributes = True
class APIEndpointListResponse(BaseModel):
    items: List[APIEndpointResponse]
    total: int
    page: int
    pages: int
    per_page: int
# Chat Schemas
class ChatMessageBase(BaseModel):
    role: str # user, assistant
    content: str
class ChatMessageCreate(BaseModel):
    content: str
class ChatMessageResponse(ChatMessageBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat Session"
    repository_id: int
class ChatSessionRename(BaseModel):
    title: str
class ChatSessionResponse(BaseModel):
    id: int
    repository_id: int
    title: str
    created_at: datetime
    class Config:
        from_attributes = True
class ChatSessionDetailResponse(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []
    class Config:
        from_attributes = True
# Dependency Graph & Code Quality Schemas
class DependencyNode(BaseModel):
    id: str
    label: str
    type: str # file, external
class DependencyEdge(BaseModel):
    source: str
    target: str
class DependencyGraphResponse(BaseModel):
    nodes: List[DependencyNode]
    edges: List[DependencyEdge]
class CodeQualityViolation(BaseModel):
    file_path: str
    line_number: int
    rule: str
    severity: str # info, warning, error
    message: str
    snippet: Optional[str] = None
class CodeQualityResponse(BaseModel):
    score: int # 0 to 100
    violations: List[CodeQualityViolation] = []
    summary: str
# Report Schemas
class ReportResponse(BaseModel):
    id: int
    repository_id: int
    report_type: str
    created_at: datetime
    content: Dict[str, Any]
    class Config:
        from_attributes = True