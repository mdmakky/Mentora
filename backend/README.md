# 🚀 Mentora - FastAPI Backend with Google Gemini

## Overview
This is a **modern, fast, and simple** backend built with:
- ⚡ **FastAPI** - Modern Python web framework
- 🤖 **Google Gemini** - Powerful AI through LangChain
- 🗄️ **SQLAlchemy** - Clean database ORM
- 🔒 **JWT Authentication** - Secure token-based auth
- 📄 **Async SQLite** - Fast async database operations

## Why FastAPI?
- **Faster** than Django (3x-10x performance boost)
- **Simpler** code - less boilerplate
- **Modern** - Built for async/await
- **Auto docs** - Swagger UI at `/docs`
- **Type safety** - Pydantic validation
- **Beginner friendly** - Easy to understand

## Project Structure
```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── core/
│   │   ├── config.py        # Settings and configuration
│   │   └── security.py      # JWT auth and password hashing
│   ├── db/
│   │   └── database.py      # Database connection and session
│   ├── models/              # SQLAlchemy models (database tables)
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── chat.py
│   │   └── analytics.py
│   ├── schemas/             # Pydantic schemas (API validation)
│   │   ├── user.py
│   │   ├── document.py
│   │   └── chat.py
│   ├── api/routes/          # API endpoints
│   │   ├── auth.py
│   │   ├── documents.py
│   │   ├── chat.py
│   │   └── analytics.py
│   └── services/            # Business logic
│       ├── ai_service.py    # Google Gemini + LangChain
│       └── pdf_service.py   # PDF processing
└── requirements.txt         # Python dependencies
```

## Quick Start

### 1. Install Requirements
```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variables
Create `.env` file in project root:
```env
GOOGLE_API_KEY=your_google_gemini_api_key_here
SECRET_KEY=your-secret-jwt-key-here
```

### 3. Run the Server
```bash
# From backend directory
uvicorn app.main:app --reload

# Or using Python
python -m app.main
```

Server runs on: `http://localhost:8000`

### 4. View API Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
```
POST   /api/auth/register              # Register new user
POST   /api/auth/login                 # Login user
POST   /api/auth/logout                # Logout user
GET    /api/auth/profile               # Get profile
PUT    /api/auth/profile/update        # Update profile
POST   /api/auth/profile/change-password  # Change password
```

### Documents
```
GET    /api/reader/documents/          # List all documents
POST   /api/reader/upload/             # Upload PDF
GET    /api/reader/documents/{id}      # Get document details
GET    /api/reader/documents/{id}/file # Download PDF
DELETE /api/reader/documents/{id}/delete  # Delete document
GET    /api/reader/documents/{id}/summary # Get summary
```

### Chat
```
GET    /api/chat/sessions/             # List chat sessions
POST   /api/chat/sessions/             # Create session
DELETE /api/chat/sessions/{id}         # Delete session
GET    /api/chat/sessions/{id}/messages  # Get messages
POST   /api/chat/sessions/{id}/messages  # Send message
POST   /api/chat/explain/              # Explain concept
```

### Analytics
```
GET    /api/analytics/insights/        # Get study insights
GET    /api/analytics/progress/        # Get progress data
GET    /api/analytics/documents/{id}   # Document analytics
POST   /api/analytics/sessions/        # Record study session
```

## Key Features

### 1. Google Gemini AI
- Uses **LangChain** for powerful AI chains
- **RAG (Retrieval Augmented Generation)** for document Q&A
- Conversation memory for context-aware responses
- Async operations for fast responses

### 2. JWT Authentication
- Secure token-based auth
- No sessions to manage
- Tokens expire after 7 days
- Password hashing with bcrypt

### 3. Async Database
- SQLAlchemy with async SQLite
- Fast concurrent operations
- Automatic migrations
- Type-safe queries

### 4. File Management
- PDFs stored in `/data/media/documents/`
- Text extraction with PyPDF2
- Automatic cleanup on delete
- Secure file access

## Database Models

### User
- Authentication (username, email, password)
- Profile (first_name, last_name, bio, phone, avatar)
- Timestamps

### Document
- File management (title, file_path, size)
- Processing status
- Page count
- Relationships to user and pages

### Page
- Page number
- Extracted content
- Belongs to document

### ChatSession
- Conversation tracking
- Optional document link
- Message history

### ChatMessage
- User or AI message
- Content and timestamp
- Belongs to session

### StudySession
- Study time tracking
- Pages viewed
- Date tracking

### UserStatistics
- Total study time
- Document count
- Study streaks

## Code Examples

### Making an API Call (Frontend)
```javascript
// Login
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'pass' })
});
const data = await response.json();
const token = data.access_token;

// Authenticated request
const docs = await fetch('http://localhost:8000/api/reader/documents/', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Creating a New Endpoint (Backend)
```python
from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/my-endpoint")
async def my_endpoint(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello, {current_user.username}!"}
```

## Google Gemini Setup

### Get API Key
1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` file: `GOOGLE_API_KEY=your_key_here`

### How It Works
```python
from app.services.ai_service import get_ai_service

ai = get_ai_service()

# Simple chat
response = await ai.get_ai_response("What is Python?")

# Chat with document context
response = await ai.get_ai_response_with_context(
    user_message="Explain this concept",
    context="Document text here...",
    history=[{"role": "user", "content": "Previous message"}]
)
```

## Development Tips

### Auto-Reload
FastAPI auto-reloads on code changes when using `--reload` flag

### Interactive Docs
Visit `/docs` to test all endpoints interactively with Swagger UI

### Database Reset
```bash
rm /home/muse-matrix/Desktop/Mentora/data/database/mentora.db
# Restart server - database will be recreated
```

### View Logs
All logs appear in the terminal where you ran uvicorn

## FastAPI vs Django

| Feature | FastAPI | Django |
|---------|---------|--------|
| Speed | Very Fast | Moderate |
| Learning Curve | Easy | Steeper |
| Async Support | Native | Limited |
| API Docs | Auto-generated | Manual |
| Code Amount | Less | More |
| Type Safety | Built-in | Optional |

## Advantages for Beginners

1. **Less Code**: Do more with less
2. **Auto Docs**: See all endpoints at `/docs`
3. **Type Hints**: Python type hints prevent bugs
4. **Modern Python**: Uses async/await
5. **Fast Development**: Changes reload instantly

## Common Tasks

### Add a New Field to User
1. Edit `app/models/user.py` - add column
2. Delete database file
3. Restart server - field added!

### Create New Endpoint
1. Add function to route file
2. Use `@router.get()` or `@router.post()`
3. FastAPI handles the rest!

### Change AI Model
Edit `app/core/config.py`:
```python
GEMINI_MODEL: str = "gemini-pro"  # or "gemini-pro-vision"
```

## Troubleshooting

### "GOOGLE_API_KEY not set"
Add key to `.env` file in project root

### Database locked
Close other connections or delete DB file

### Import errors
Install requirements: `pip install -r requirements.txt`

### Port 8000 in use
```bash
lsof -ti:8000 | xargs kill -9
```

## Production Deployment

### Environment Variables
Set these in production:
- `SECRET_KEY` - Long random string
- `GOOGLE_API_KEY` - Your Gemini API key
- `DEBUG=False` - Disable debug mode

### Run with Gunicorn
```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Learn More

- FastAPI: https://fastapi.tiangolo.com/
- Google Gemini: https://ai.google.dev/
- LangChain: https://python.langchain.com/
- SQLAlchemy: https://www.sqlalchemy.org/
- Pydantic: https://docs.pydantic.dev/

## Next Steps

1. ✅ Backend is ready to run
2. Install dependencies: `pip install -r requirements.txt`
3. Set GOOGLE_API_KEY in `.env`
4. Run: `uvicorn app.main:app --reload`
5. Test at: `http://localhost:8000/docs`
6. Connect frontend!

---

**Made with ❤️ using FastAPI and Google Gemini!**
