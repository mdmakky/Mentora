"""
Pydantic schemas for Document-related requests and responses
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# Response schemas

class PageResponse(BaseModel):
    """Schema for page data"""
    page_number: int
    content_preview: Optional[str] = None  # First 200 chars
    
    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    """Schema for document data"""
    id: str
    title: str
    total_pages: int
    file_size: int
    is_processed: bool
    is_embedded: bool
    upload_date: datetime
    
    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    """Schema for detailed document data with sample pages"""
    sample_pages: List[PageResponse] = []


class DocumentListResponse(BaseModel):
    """Schema for list of documents"""
    documents: List[DocumentResponse]


class DocumentUploadResponse(BaseModel):
    """Schema for upload response"""
    message: str
    document: DocumentResponse
