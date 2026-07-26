import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from app.database import Base
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    picture = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    repositories = relationship("Repository", back_populates="owner", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="owner", cascade="all, delete-orphan")
class Repository(Base):
    __tablename__ = "repositories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    framework = Column(String, nullable=True) # fastapi, flask, django, unknown
    total_files = Column(Integer, default=0)
    size = Column(Integer, default=0) # in bytes
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Relationships
    owner = relationship("User", back_populates="repositories")
    files = relationship("RepositoryFile", back_populates="repository", cascade="all, delete-orphan")
    endpoints = relationship("APIEndpoint", back_populates="repository", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="repository", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="repository", cascade="all, delete-orphan")
    analysis_history = relationship("AnalysisHistory", back_populates="repository", cascade="all, delete-orphan")
class RepositoryFile(Base):
    __tablename__ = "repository_files"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    filepath = Column(String, nullable=False, index=True) # relative path within repository
    content = Column(Text, nullable=True) # store content of Python source files for AST parsing/context
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    repository = relationship("Repository", back_populates="files")
class APIEndpoint(Base):
    __tablename__ = "api_endpoints"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    route = Column(String, nullable=False, index=True)
    method = Column(String, nullable=False, index=True) # GET, POST, etc.
    function_name = Column(String, nullable=False)
    parameters = Column(JSON, nullable=True) # List of dict: {name, type, required, default, in}
    return_type = Column(String, nullable=True)
    response_model = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True, default=200)
    tags = Column(JSON, nullable=True) # Tags / categories
    docstring = Column(Text, nullable=True)
    file_path = Column(String, nullable=False) # File defining the endpoint
    line_number = Column(Integer, nullable=True)
    module_name = Column(String, nullable=True)
    dependencies = Column(JSON, nullable=True) # Internal code deps or middlewares
    auth = Column(Boolean, default=False) # If auth is detected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    repository = relationship("Repository", back_populates="endpoints")
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    repository = relationship("Repository", back_populates="chat_sessions")
    owner = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False) # user, assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String, nullable=False) # technical, dependency, quality
    content = Column(JSON, nullable=False) # Structured report analysis
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    repository = relationship("Repository", back_populates="reports")
class AnalysisHistory(Base):
    __tablename__ = "analysis_history"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    framework_detected = Column(String, nullable=True)
    total_files = Column(Integer, default=0)
    total_endpoints = Column(Integer, default=0)
    duration_ms = Column(Float, default=0.0)
    status = Column(String, default="pending") # pending, success, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Relationships
    repository = relationship("Repository", back_populates="analysis_history")
