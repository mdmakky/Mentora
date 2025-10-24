"""
Chat Routes
Handles AI chat sessions and messages with Google Gemini
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.document import Document, Page
from app.schemas.chat import (
    ChatSessionCreate, MessageSend, ConceptExplain,
    ChatSessionResponse, ChatSessionListResponse,
    MessagesListResponse, MessageResponse, MessageSendResponse
)
from app.core.security import get_current_user
from app.services.ai_service import get_ai_service
from app.services.vector_service import get_vector_service

router = APIRouter()


@router.get("/sessions/", response_model=ChatSessionListResponse)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all chat sessions for current user"""
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == current_user.id)
    )
    sessions = result.scalars().all()
    
    sessions_data = []
    for session in sessions:
        # Get last message
        msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(1)
        )
        last_message = msg_result.scalar_one_or_none()
        
        # Get document if linked
        doc_title = None
        if session.document_id:
            doc_result = await db.execute(
                select(Document).where(Document.id == session.document_id)
            )
            doc = doc_result.scalar_one_or_none()
            if doc:
                doc_title = doc.title
        
        sessions_data.append({
            "id": session.id,
            "title": session.title,
            "document_id": session.document_id,
            "document_title": doc_title,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "last_message": last_message.content[:100] if last_message else None
        })
    
    return {"sessions": sessions_data}


@router.post("/sessions/", status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session"""
    # Verify document if provided
    document = None
    if session_data.document_id:
        result = await db.execute(
            select(Document).where(
                Document.id == session_data.document_id,
                Document.user_id == current_user.id
            )
        )
        document = result.scalar_one_or_none()
    
    # Create session
    session = ChatSession(
        user_id=current_user.id,
        title=session_data.title,
        document_id=session_data.document_id
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return {
        "session_id": session.id,
        "title": session.title,
        "document_id": session.document_id
    }


@router.delete("/sessions/{session_id}/")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session"""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    
    return {"message": "Session deleted successfully"}


@router.get("/sessions/{session_id}/messages/", response_model=MessagesListResponse)
async def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all messages in a chat session"""
    # Verify session belongs to user
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get messages
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp)
    )
    messages = result.scalars().all()
    
    messages_data = [
        {
            "id": msg.id,
            "type": msg.message_type,
            "content": msg.content,
            "timestamp": msg.timestamp
        }
        for msg in messages
    ]
    
    return {"messages": messages_data}


@router.post("/sessions/{session_id}/messages/", response_model=MessageSendResponse)
async def send_message(
    session_id: str,
    message_data: MessageSend,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message and get AI response"""
    # Verify session
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save user message
    user_message = ChatMessage(
        session_id=session_id,
        message_type="user",
        content=message_data.content
    )
    
    db.add(user_message)
    await db.commit()
    await db.refresh(user_message)
    
    # Get conversation history
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(10)
    )
    previous_messages = list(reversed(result.scalars().all()))
    
    history = []
    for msg in previous_messages[:-1]:  # Exclude current message
        history.append({
            "role": "user" if msg.message_type == "user" else "assistant",
            "content": msg.content
        })
    
    # Get document context using vector search
    context = None
    if session.document_id:
        # Use vector search to find relevant chunks
        vector_service = get_vector_service()
        search_results = await vector_service.search(
            query=message_data.content,
            user_id=current_user.id,
            document_ids=[session.document_id],
            n_results=5
        )
        
        if search_results:
            # Combine relevant chunks into context
            context = "\n\n".join([result['content'] for result in search_results])
            print(f"📚 Found {len(search_results)} relevant chunks for query")
        else:
            # Fallback to getting first few pages if vector search fails
            result = await db.execute(
                select(Page)
                .join(Document)
                .where(Document.id == session.document_id)
                .limit(5)
            )
            pages = result.scalars().all()
            if pages:
                context = "\n\n".join([p.content for p in pages])
    
    # Get AI response
    ai_service = get_ai_service()
    
    try:
        if context:
            ai_response = await ai_service.get_ai_response_with_context(
                message_data.content, context, history
            )
        else:
            ai_response = await ai_service.get_ai_response(
                message_data.content, history
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )
    
    # Save AI response
    ai_message = ChatMessage(
        session_id=session_id,
        message_type="ai",
        content=ai_response
    )
    
    db.add(ai_message)
    await db.commit()
    await db.refresh(ai_message)
    
    return {
        "user_message": {
            "id": user_message.id,
            "type": "user",
            "content": user_message.content,
            "timestamp": user_message.timestamp
        },
        "ai_response": {
            "id": ai_message.id,
            "type": "ai",
            "content": ai_message.content,
            "timestamp": ai_message.timestamp
        }
    }


@router.post("/explain/")
async def explain_concept(
    data: ConceptExplain,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Explain a concept using RAG (Retrieval Augmented Generation)
    - Uses vector search to find relevant document chunks
    - Supports chat history for context
    - Returns AI-generated explanation
    """
    context = None
    
    # Get document context using vector search (RAG)
    if data.document_id:
        from app.services.vector_service import get_vector_service
        
        # Verify user owns the document
        result = await db.execute(
            select(Document).where(
                Document.id == data.document_id,
                Document.user_id == current_user.id
            )
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Use vector search to find relevant chunks
        vector_service = get_vector_service()
        search_results = await vector_service.search(
            query=data.concept,
            user_id=current_user.id,
            document_ids=[data.document_id],
            n_results=5  # Get top 5 most relevant chunks
        )
        
        if search_results:
            # Combine relevant chunks as context
            context = "\n\n".join([
                f"[Page {result['metadata']['page_number']}]: {result['content']}"
                for result in search_results
            ])
            print(f"✅ Found {len(search_results)} relevant chunks for query: {data.concept[:50]}...")
        else:
            print(f"⚠️ No relevant chunks found, falling back to first pages")
            # Fallback to first 5 pages if vector search fails
            result = await db.execute(
                select(Page)
                .where(Page.document_id == data.document_id)
                .limit(5)
            )
            pages = result.scalars().all()
            if pages:
                context = "\n\n".join([f"[Page {p.page_number}]: {p.content}" for p in pages])
    
    # Prepare chat history for AI
    history = []
    if data.chat_history:
        for msg in data.chat_history:
            if msg.role == 'user':
                history.append({"role": "user", "content": msg.content})
            elif msg.role == 'assistant':
                history.append({"role": "assistant", "content": msg.content})
    
    # Get AI explanation with context and history
    ai_service = get_ai_service()
    
    try:
        explanation = await ai_service.explain_concept_with_history(
            concept=data.concept,
            context=context,
            chat_history=history
        )
    except Exception as e:
        print(f"❌ AI service error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )
    
    return {"explanation": explanation}
