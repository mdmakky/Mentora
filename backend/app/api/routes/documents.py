"""
Document Routes
Handles PDF upload, listing, viewing, and deletion
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import os

from app.db.database import get_db
from app.models.user import User
from app.models.document import Document, Page
from app.schemas.document import DocumentResponse, DocumentListResponse, DocumentDetailResponse
from app.core.security import get_current_user
from app.core.config import settings
from app.services.pdf_service import save_uploaded_file, extract_pdf_text, delete_file
from app.services.vector_service import get_vector_service
from jose import JWTError, jwt

router = APIRouter()


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all documents for current user"""
    result = await db.execute(
        select(Document).where(Document.user_id == current_user.id)
    )
    documents = result.scalars().all()
    
    return {"documents": [DocumentResponse.from_orm(doc) for doc in documents]}


@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new PDF document"""
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )
    
    # Save file
    file_path = await save_uploaded_file(file, settings.DOCUMENTS_PATH)
    file_size = os.path.getsize(file_path)
    
    # Create document record
    document = Document(
        user_id=current_user.id,
        title=title or file.filename,
        file_path=file_path,
        file_size=file_size
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Extract text in background
    try:
        pages_text = await extract_pdf_text(file_path)
        document.total_pages = len(pages_text)
        
        # Prepare pages for database and vectorization
        pages_data = []
        for page_num, text in enumerate(pages_text, start=1):
            page = Page(
                document_id=document.id,
                page_number=page_num,
                content=text
            )
            db.add(page)
            
            # Collect for vectorization
            pages_data.append({
                'page_number': page_num,
                'content': text
            })
        
        document.is_processed = True
        await db.commit()
        
        # Vectorize the document
        vector_service = get_vector_service()
        success = await vector_service.add_document(
            document_id=document.id,
            pages=pages_data,
            user_id=current_user.id
        )
        
        if success:
            document.is_embedded = True
            await db.commit()
            print(f"✅ Document {document.id} processed and vectorized successfully")
        else:
            print(f"⚠️ Document {document.id} processed but vectorization failed")
        
    except Exception as e:
        print(f"Error processing PDF: {e}")
        import traceback
        traceback.print_exc()
    
    return {
        "message": "Document uploaded successfully",
        "document": DocumentResponse.from_orm(document)
    }


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific document"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentResponse.from_orm(document)


@router.get("/documents/{document_id}/file")
async def get_document_file(
    document_id: str,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Download/view PDF file - supports both Bearer token and query parameter"""
    # Try to get user from token query parameter
    user_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("user_id")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get document
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        document.file_path,
        media_type="application/pdf",
        filename=f"{document.title}.pdf"
    )


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a document"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete vectors first
    vector_service = get_vector_service()
    await vector_service.delete_document(document.id)
    
    # Delete file
    delete_file(document.file_path)
    
    # Delete database record
    await db.delete(document)
    await db.commit()
    
    return {"message": "Document deleted successfully"}


@router.get("/documents/{document_id}/summary/", response_model=DocumentDetailResponse)
async def get_document_summary(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get document summary with sample pages"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get sample pages
    result = await db.execute(
        select(Page).where(Page.document_id == document_id).limit(3)
    )
    pages = result.scalars().all()
    
    sample_pages = []
    for page in pages:
        preview = page.content[:200] + "..." if len(page.content) > 200 else page.content
        sample_pages.append({
            "page_number": page.page_number,
            "content_preview": preview
        })
    
    response = DocumentResponse.from_orm(document)
    return {"sample_pages": sample_pages, **response.dict()}
