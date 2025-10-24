"""
Analytics models - tracks study sessions and statistics
"""

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base


class StudySession(Base):
    """
    Study session table - tracks individual study sessions
    """
    __tablename__ = "study_sessions"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    
    # Session info
    duration_minutes = Column(Integer, default=0)
    pages_viewed = Column(Integer, default=0)
    date = Column(Date, server_default=func.current_date())
    
    # Timestamp
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<StudySession {self.duration_minutes}min on {self.date}>"


class UserStatistics(Base):
    """
    User statistics table - stores aggregate statistics per user
    """
    __tablename__ = "user_statistics"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key - one stat record per user
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Statistics
    total_study_time_minutes = Column(Integer, default=0)
    total_documents_uploaded = Column(Integer, default=0)
    total_chat_messages = Column(Integer, default=0)
    current_study_streak_days = Column(Integer, default=0)
    last_study_date = Column(Date, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<UserStatistics for user {self.user_id}>"
