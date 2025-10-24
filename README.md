# Mentora - AI-Powered Study Assistant 📚

An intelligent study companion that helps you learn from your documents using AI-powered chat, analytics, and document management.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+ installed
- Node.js 16+ and npm installed
- Git installed

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mdmakky/Mentora.git
cd Mentora
```

### 2. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Linux/Mac:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create .env file)
# Add your Google Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 3. Frontend Setup (React)

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

---

## 🎯 Running the Application

### Method 1: Using Individual Commands

#### Start Backend Server

```bash
# From project root
cd backend

# Activate virtual environment if not already activated
source .venv/bin/activate  # Linux/Mac
# OR
.venv\Scripts\activate     # Windows

# Run the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will run at:** `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

#### Start Frontend Server

```bash
# Open a new terminal
# From project root
cd frontend

# Start the React development server
npm start
```

**Frontend will run at:** `http://localhost:3000`

---

### Method 2: Using Startup Scripts (Recommended)

The project includes convenient startup scripts:

#### Start Backend Only

```bash
# From project root
./start-backend.sh
```

#### Start Frontend Only

```bash
# From project root
./start-frontend.sh
```

#### Start Both Backend and Frontend

```bash
# From project root
./start-mentora.sh
```

#### Stop All Servers

```bash
# From project root
./stop-servers.sh
```

---

## 🔑 Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Google Gemini AI API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration (Optional - uses SQLite by default)
DATABASE_URL=sqlite:///./mentora.db

# Secret Key for JWT tokens (Optional - auto-generated if not provided)
SECRET_KEY=your_secret_key_here

# CORS Origins (Optional)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Getting Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env` file

---

## 📁 Project Structure

```
Mentora/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   └── routes/        # Endpoint definitions
│   │   ├── core/              # Core configurations
│   │   ├── db/                # Database setup
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── contexts/          # React contexts
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   └── styles/            # CSS styles
│   ├── package.json           # Node dependencies
│   └── public/                # Static files
│
├── data/                      # Application data
│   ├── database/              # SQLite database
│   ├── media/                 # Uploaded files
│   └── vector_db/             # Vector embeddings
│
├── scripts/                   # Utility scripts
├── start-backend.sh           # Backend startup script
├── start-frontend.sh          # Frontend startup script
├── start-mentora.sh           # Full app startup script
└── stop-servers.sh            # Stop all servers
```

---

## 🎨 Features

### ✅ Document Management
- Upload and manage PDF documents
- View PDFs in browser with AI chat sidebar
- Track reading sessions and study time

### ✅ AI Chat System
- Session-based conversations
- Document-specific queries with RAG (Retrieval-Augmented Generation)
- General knowledge questions
- Message formatting (bold, bullets, code blocks)
- Copy messages to clipboard
- Rename chat sessions
- Delete conversations

### ✅ Analytics Dashboard
- Study time tracking
- Weekly progress charts
- Document distribution by study time
- Recent activity timeline
- Session statistics

### ✅ User Profile
- Avatar upload
- Password management
- Theme toggle (Light/Dark mode)
- Profile information updates

---

## 🛠️ Development

### Backend Development

```bash
# Run with auto-reload (development)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests (if available)
pytest

# Format code
black app/
isort app/
```

### Frontend Development

```bash
# Run development server
cd frontend
npm start

# Build for production
npm run build

# Run tests
npm test

# Format code
npm run format
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/update/` - Update profile
- `POST /api/auth/profile/avatar/` - Upload avatar

### Documents
- `GET /api/reader/documents/` - List documents
- `POST /api/reader/upload/` - Upload PDF
- `GET /api/reader/documents/{id}/` - Get document details
- `DELETE /api/reader/documents/{id}/` - Delete document

### Chat
- `GET /api/chat/sessions/` - List chat sessions
- `POST /api/chat/sessions/` - Create new session
- `PUT /api/chat/sessions/{id}/` - Update session (rename)
- `DELETE /api/chat/sessions/{id}/` - Delete session
- `GET /api/chat/sessions/{id}/messages/` - Get messages
- `POST /api/chat/sessions/{id}/messages/` - Send message

### Analytics
- `GET /api/analytics/insights/` - Get study insights
- `GET /api/analytics/progress/` - Get progress data
- `GET /api/analytics/sessions/` - Get study sessions
- `POST /api/analytics/sessions/` - Record study session

**Full API documentation:** `http://localhost:8000/docs`

---

## 🔧 Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

**Module not found:**
```bash
# Ensure virtual environment is activated
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Database errors:**
```bash
# Delete and recreate database
rm data/database/mentora.db
# Restart backend - it will auto-create tables
```

### Frontend Issues

**Port 3000 already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Module not found:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build errors:**
```bash
# Clear cache and rebuild
npm cache clean --force
npm install
npm start
```

---

## 🎯 Usage Guide

### 1. **Upload Documents**
- Go to Study Page
- Click "Upload PDF" button
- Select your PDF file
- Document will be processed and ready for AI queries

### 2. **Chat with AI**
- Click on a document to open PDF viewer
- Use chat sidebar for document-specific questions
- Or go to Chat Page for general conversations
- Toggle document search on/off with PDF icon

### 3. **Track Progress**
- Visit Analytics Page
- View study time, sessions, and progress
- See which documents you study most
- Track weekly study patterns

### 4. **Organize Chats**
- Create multiple chat sessions
- Rename sessions for better organization
- Delete old conversations
- Copy important AI responses

---

## 🚨 Important Notes

### Security
- Never commit `.env` file to version control
- Keep your API keys secure
- Use strong passwords
- Change default SECRET_KEY in production

### Performance
- Large PDFs (>50MB) may take time to process
- Vector search is optimized for documents <100 pages
- Session tracking records only if you study ≥1 minute

### Browser Support
- Chrome/Edge (recommended)
- Firefox
- Safari (limited testing)
- Modern browsers with ES6+ support

---

## 📚 Documentation

- [Architecture Guide](./ARCHITECTURE_EXPLAINED.md)
- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [ChatPage Improvements](./CHATPAGE_IMPROVEMENTS.md)
- [ChatPage User Guide](./CHATPAGE_USER_GUIDE.md)
- [Deployment Options](./DEPLOYMENT_OPTIONS.md)
- [Features Complete](./FEATURES_COMPLETE.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Muhammad Makky**
- GitHub: [@mdmakky](https://github.com/mdmakky)

---

## 🙏 Acknowledgments

- Google Gemini AI for powerful language model
- FastAPI for excellent backend framework
- React for robust frontend development
- ChromaDB for vector storage
- All open-source contributors

---

## 📧 Support

If you encounter any issues or have questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review existing documentation
3. Open an issue on GitHub
4. Contact the maintainer

---

**Happy Studying with Mentora! 🎓✨**
