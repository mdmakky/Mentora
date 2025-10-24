"""
Document models - handles PDF documents and pages
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid


class Document(Base):
    """
    Document table - stores uploaded PDF files
    """
    __tablename__ = "documents"
    
    # Primary key - using UUID for security
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Document info
    title = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Path to PDF file
    total_pages = Column(Integer, default=0)
    file_size = Column(Integer, default=0)  # Size in bytes
    
    # Processing status
    is_processed = Column(Boolean, default=False)  # Text extracted?
    is_embedded = Column(Boolean, default=False)  # Embeddings created?
    
    # Timestamps
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    pages = relationship("Page", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Document {self.title}>"


class Page(Base):
    """
    Page table - stores extracted text from PDF pages
    """
    __tablename__ = "pages"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to document
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    # Page info
    page_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)  # Extracted text
    
    # Relationship
    document = relationship("Document", back_populates="pages")
    
    def __repr__(self):
        return f"<Page {self.page_number} of Document {self.document_id}>"
