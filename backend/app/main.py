"""
Main FastAPI Application
Entry point for the Mentora backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.database import init_db
from app.api.routes import auth, documents, chat, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle events - runs on startup and shutdown
    """
    # Startup: Initialize database
    print("🚀 Starting up Mentora API...")
    await init_db()
    print("✅ Database initialized")
    
    yield
    
    # Shutdown
    print("👋 Shutting down Mentora API...")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (for serving PDFs, avatars, etc.)
app.mount("/media", StaticFiles(directory=str(settings.MEDIA_ROOT)), name="media")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/reader", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Welcome to Mentora API",
        "version": settings.VERSION,
        "framework": "FastAPI",
        "ai": "Google Gemini + LangChain",
        "endpoints": {
            "docs": "/docs",
            "auth": "/api/auth",
            "documents": "/api/reader",
            "chat": "/api/chat",
            "analytics": "/api/analytics",
        },
        "frontend": "http://localhost:3000",
    }


@app.get("/api")
async def api_root():
    """API info endpoint"""
    return await root()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=settings.DEBUG)
