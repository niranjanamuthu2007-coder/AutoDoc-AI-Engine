from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ChatSession, ChatMessage, Repository
from app.schemas import (
    ChatSessionResponse, 
    ChatSessionDetailResponse, 
    ChatSessionCreate, 
    ChatSessionRename,
    ChatMessageCreate, 
    ChatMessageResponse
)
from app.auth import get_current_user
from app.services.ai_service import AIService
router = APIRouter(prefix="/chat", tags=["chat"])
@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Spins up a new chat session bound to a repository.
    """
    repo = db.query(Repository).filter(
        Repository.id == payload.repository_id,
        Repository.owner_id == current_user.id
    ).first()
    
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found or access denied."
        )
    session = ChatSession(
        repository_id=payload.repository_id,
        owner_id=current_user.id,
        title=payload.title or f"Chat session about {repo.name}"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_sessions(
    repository_id: int,
    search: Optional[str] = Query(None, description="Search term mapping session titles"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List previous sessions associated with a repository.
    """
    query = db.query(ChatSession).filter(
        ChatSession.repository_id == repository_id,
        ChatSession.owner_id == current_user.id
    )
    if search:
        query = query.filter(ChatSession.title.ilike(f"%{search}%"))
    return query.order_by(ChatSession.created_at.desc()).all()
@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
def get_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full historic messages in a session.
    """
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.owner_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )
    return session
@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
def rename_session(
    session_id: int,
    payload: ChatSessionRename,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Renames a session.
    """
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.owner_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )
    session.title = payload.title
    db.commit()
    db.refresh(session)
    return session
@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a session and cascaded messages.
    """
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.owner_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )
    db.delete(session)
    db.commit()
    return {"detail": "Session deleted."}
@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def post_chat_message(
    session_id: int,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sends prompt to AI and appends prompt + response to persistent chat database.
    """
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.owner_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )
    # 1. Save user message to database
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=payload.content
    )
    db.add(user_msg)
    db.commit()
    # 2. Package chat history to keep conversational context
    history_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()
    # Format history structure (excluding the current user message to avoid duplicate submission)
    history_payload = []
    for msg in history_messages[:-1]:
        history_payload.append({
            "role": msg.role,
            "content": msg.content
        })
    # 3. Call AI Service
    ai_service = AIService(db)
    ai_response_text = await ai_service.ask_gemini(
        prompt=payload.content,
        repo_id=session.repository_id,
        history=history_payload
    )
    # 4. Save AI response message to database
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_response_text
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg