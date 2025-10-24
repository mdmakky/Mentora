"""
Analytics Routes
Handles study session tracking and statistics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.analytics import StudySession, UserStatistics
from app.core.security import get_current_user

router = APIRouter()


@router.get("/insights/")
async def get_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get study insights for current user"""
    # Get or create statistics
    result = await db.execute(
        select(UserStatistics).where(UserStatistics.user_id == current_user.id)
    )
    stats = result.scalar_one_or_none()
    
    if not stats:
        stats = UserStatistics(user_id=current_user.id)
        db.add(stats)
        await db.commit()
        await db.refresh(stats)
    
    # Get this week's study time
    week_ago = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(func.sum(StudySession.duration_minutes))
        .where(
            StudySession.user_id == current_user.id,
            StudySession.start_time >= week_ago
        )
    )
    week_study_time = result.scalar() or 0
    
    # Get recent sessions count
    result = await db.execute(
        select(func.count(StudySession.id))
        .where(StudySession.user_id == current_user.id)
        .limit(10)
    )
    recent_count = result.scalar() or 0
    
    return {
        "total_study_time": stats.total_study_time_minutes,
        "total_documents": stats.total_documents_uploaded,
        "total_chats": stats.total_chat_messages,
        "current_streak": stats.current_study_streak_days,
        "last_study_date": stats.last_study_date,
        "week_study_time": week_study_time,
        "recent_sessions_count": recent_count
    }


@router.get("/progress/")
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get study progress over time"""
    # Get sessions from last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    result = await db.execute(
        select(StudySession)
        .where(
            StudySession.user_id == current_user.id,
            StudySession.start_time >= thirty_days_ago
        )
        .order_by(StudySession.date)
    )
    sessions = result.scalars().all()
    
    # Group by date
    progress_by_date = {}
    for session in sessions:
        date_key = session.date.isoformat()
        if date_key not in progress_by_date:
            progress_by_date[date_key] = {
                "date": date_key,
                "duration_minutes": 0,
                "documents_studied": set()
            }
        progress_by_date[date_key]["duration_minutes"] += session.duration_minutes
        if session.document_id:
            progress_by_date[date_key]["documents_studied"].add(session.document_id)
    
    # Convert to list
    progress_data = []
    for date_key in sorted(progress_by_date.keys()):
        data = progress_by_date[date_key]
        progress_data.append({
            "date": data["date"],
            "duration_minutes": data["duration_minutes"],
            "documents_count": len(data["documents_studied"])
        })
    
    return {"progress": progress_data}


@router.get("/documents/{document_id}/")
async def get_document_analytics(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics for a specific document"""
    # Verify document
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get sessions for this document
    result = await db.execute(
        select(
            func.sum(StudySession.duration_minutes).label("total_time"),
            func.count(StudySession.id).label("total_sessions"),
            func.sum(StudySession.pages_viewed).label("total_pages")
        )
        .where(StudySession.document_id == document_id)
    )
    stats = result.one()
    
    total_time = stats.total_time or 0
    total_sessions = stats.total_sessions or 0
    total_pages = stats.total_pages or 0
    avg_time = total_time // total_sessions if total_sessions > 0 else 0
    
    return {
        "document_id": document_id,
        "document_title": document.title,
        "total_study_time": total_time,
        "total_sessions": total_sessions,
        "total_pages_viewed": total_pages,
        "average_session_time": avg_time
    }


@router.post("/sessions/", status_code=status.HTTP_201_CREATED)
async def record_session(
    duration: int,
    pages_viewed: int = 0,
    document_id: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record a study session"""
    # Verify document if provided
    if document_id:
        result = await db.execute(
            select(Document).where(
                Document.id == document_id,
                Document.user_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            document_id = None
    
    # Create session
    session = StudySession(
        user_id=current_user.id,
        document_id=document_id,
        duration_minutes=duration,
        pages_viewed=pages_viewed
    )
    
    db.add(session)
    
    # Update user statistics
    result = await db.execute(
        select(UserStatistics).where(UserStatistics.user_id == current_user.id)
    )
    stats = result.scalar_one_or_none()
    
    if not stats:
        stats = UserStatistics(user_id=current_user.id)
        db.add(stats)
    
    stats.total_study_time_minutes += duration
    
    # Update streak - calculate BEFORE updating last_study_date
    if stats.last_study_date:
        days_diff = (session.date - stats.last_study_date).days
        if days_diff == 0:
            # Same day - don't change streak
            pass
        elif days_diff == 1:
            # Consecutive day - increment streak
            stats.current_study_streak_days += 1
        else:
            # Gap in days - reset streak to 1
            stats.current_study_streak_days = 1
    else:
        # First session ever
        stats.current_study_streak_days = 1
    
    # Update last study date after streak calculation
    stats.last_study_date = session.date
    
    await db.commit()
    await db.refresh(session)
    
    return {
        "message": "Session recorded successfully",
        "session_id": session.id
    }

@router.get("/sessions/")
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all study sessions for current user"""
    result = await db.execute(
        select(StudySession)
        .where(StudySession.user_id == current_user.id)
        .order_by(StudySession.start_time.desc())
    )
    sessions = result.scalars().all()
    
    return {
        "sessions": [
            {
                "id": session.id,
                "document_id": session.document_id,
                "duration_minutes": session.duration_minutes,
                "pages_viewed": session.pages_viewed,
                "date": session.date.isoformat() if session.date else None,
                "start_time": session.start_time.isoformat() if session.start_time else None
            }
            for session in sessions
        ]
    }
