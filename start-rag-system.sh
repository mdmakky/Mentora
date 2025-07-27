#!/bin/bash
# Mentora RAG System Setup and Startup Script

echo "🚀 Mentora - AI Study Assistant with RAG"
echo "========================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📚 Installing dependencies..."
pip install -r backend/requirements.txt

# Check for .env file
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Environment file not found. Creating from template..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env and add your Google AI API key!"
    echo "   GOOGLE_API_KEY=your_actual_api_key_here"
    echo ""
    read -p "Press Enter after you've configured your API key..."
fi

# Run database migrations
echo "🗄️  Setting up database..."
cd backend
python manage.py migrate

# Test the RAG system
echo "🧪 Testing RAG system..."
python test_rag.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ RAG system test passed!"
    echo ""
    echo "🌟 Starting Django development server..."
    echo "   Access the API at: http://localhost:8000"
    echo "   API documentation: http://localhost:8000/api/"
    echo ""
    echo "📖 Key endpoints:"
    echo "   POST /api/reader/upload/     - Upload PDF documents"
    echo "   POST /api/reader/search/     - Semantic search"
    echo "   POST /api/reader/chat/       - RAG-powered chat"
    echo "   GET  /api/reader/stats/      - System statistics"
    echo ""
    echo "🛑 Press Ctrl+C to stop the server"
    echo ""
    
    python manage.py runserver
else
    echo "❌ RAG system test failed. Please check the error messages above."
    echo "💡 Common issues:"
    echo "   - Missing Google AI API key in .env file"
    echo "   - Insufficient memory for embeddings model"
    echo "   - Internet connection required for initial model download"
fi
