"""
Chat models - handles AI chat sessions and messages
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid


class ChatSession(Base):
    """
    Chat session table - stores conversation sessions
    """
    __tablename__ = "chat_sessions"
    
    # Primary key - using UUID
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    
    # Session info
    title = Column(String(255), default="New Chat")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ChatSession {self.title}>"


class ChatMessage(Base):
    """
    Chat message table - stores individual messages in a chat
    """
    __tablename__ = "chat_messages"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to session
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    
    # Message info
    message_type = Column(String(10), nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=False)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    session = relationship("ChatSession", back_populates="messages")
    
    def __repr__(self):
        return f"<ChatMessage {self.message_type}: {self.content[:30]}>"
