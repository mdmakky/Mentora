"""
Pydantic schemas for Chat-related requests and responses
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# Request schemas

class ChatSessionCreate(BaseModel):
    """Schema for creating a new chat session"""
    title: str = "New Chat"
    document_id: Optional[str] = None


class MessageSend(BaseModel):
    """Schema for sending a message"""
    content: str
    document_id: Optional[str] = None
    search_documents: bool = False


class ChatMessage(BaseModel):
    """Schema for a chat message in history"""
    role: str  # 'user' or 'assistant'
    content: str


class ConceptExplain(BaseModel):
    """Schema for explaining a concept with RAG"""
    concept: str
    document_id: Optional[str] = None
    chat_history: Optional[List[ChatMessage]] = None


# Response schemas

class MessageResponse(BaseModel):
    """Schema for a single message"""
    id: int
    type: str
    content: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    """Schema for a chat session"""
    id: int
    title: str
    document_id: Optional[str] = None
    document_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class ChatSessionListResponse(BaseModel):
    """Schema for list of chat sessions"""
    sessions: List[ChatSessionResponse]


class MessagesListResponse(BaseModel):
    """Schema for list of messages"""
    messages: List[MessageResponse]


class MessageSendResponse(BaseModel):
    """Schema for message send response"""
    user_message: MessageResponse
    ai_message: MessageResponse
