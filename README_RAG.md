# Mentora - AI-Powered Study Assistant with RAG

A Django-based study assistant that implements **Retrieval Augmented Generation (RAG)** to help students interact with their PDF documents using AI.

## 🚀 Features

### Core RAG Implementation
- **PDF Processing**: Automatic text extraction and chunking from uploaded PDFs
- **Vector Embeddings**: Local sentence transformer embeddings (all-MiniLM-L6-v2)
- **Semantic Search**: ChromaDB-powered vector search for document content
- **Contextual AI Chat**: RAG-powered conversations that reference document content
- **Local-First Architecture**: No dependency on AWS services, runs entirely locally

### Study Features
- Document upload and processing
- Topic detection and categorization
- Flashcard generation
- Study session tracking
- Analytics and progress monitoring

## 🏗️ Architecture

This system implements the RAG pattern similar to AWS-based solutions but using local alternatives:

```
PDF Upload → Text Extraction → Chunking → Embeddings → Vector Database
                                                              ↓
User Query → Embedding → Semantic Search → Context → LLM → Response
```

### Technology Stack
- **Backend**: Django + Django REST Framework
- **Vector Database**: ChromaDB (local alternative to AWS RDS)
- **Embeddings**: Sentence Transformers (local alternative to AWS Bedrock)
- **File Storage**: Local filesystem (alternative to AWS S3)
- **AI**: Google Gemini API (can be switched to OpenAI)

## 📋 Prerequisites

- Python 3.8+
- Google AI API key (for Gemini)
- At least 2GB RAM for embeddings processing

## 🛠️ Installation

1. **Clone and Setup Environment**
   ```bash
   cd Mentora/backend
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate     # Windows
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env and add your Google AI API key:
   # GOOGLE_API_KEY=your_actual_api_key_here
   ```

4. **Database Setup**
   ```bash
   python manage.py migrate
   ```

5. **Test the RAG System**
   ```bash
   python test_rag.py
   ```

6. **Start the Server**
   ```bash
   python manage.py runserver
   ```

## 📖 API Usage

### Core RAG Endpoints

#### Upload and Process Document
```bash
POST /api/reader/upload/
Content-Type: multipart/form-data

# Body: file (PDF) + title (optional)
```

This endpoint:
- Extracts text from PDF
- Creates page-wise content
- Generates embeddings for semantic search
- Stores chunks in vector database

#### Semantic Search
```bash
POST /api/reader/search/
Content-Type: application/json

{
  "query": "What is machine learning?",
  "document_ids": ["doc-uuid-1", "doc-uuid-2"],  # optional
  "top_k": 5
}
```

#### RAG Chat
```bash
POST /api/reader/chat/
Content-Type: application/json

{
  "query": "Explain the main concepts from this document",
  "document_ids": ["doc-uuid"],
  "chat_history": [
    {"message_type": "user", "content": "Previous question"},
    {"message_type": "ai", "content": "Previous response"}
  ]
}
```

#### Get System Stats
```bash
GET /api/reader/stats/
```

Returns information about processed documents and vector database statistics.

### Chat Sessions (Enhanced with RAG)

The chat system now uses RAG to provide contextual responses:

```bash
POST /api/chat/sessions/{session_id}/messages/
Content-Type: application/json

{
  "message": "Explain the key concepts in chapter 3"
}
```

## 🎯 How the RAG System Works

### 1. Document Processing Flow
```python
# When a PDF is uploaded:
1. PDF → Text Extraction (PyPDF2/pypdf)
2. Text → Chunks (RecursiveCharacterTextSplitter)
3. Chunks → Embeddings (sentence-transformers)
4. Embeddings → Storage (ChromaDB)
```

### 2. Query Processing Flow
```python
# When a user asks a question:
1. Query → Embedding (sentence-transformers)
2. Embedding → Vector Search (ChromaDB)
3. Retrieved Chunks → Context Assembly
4. Context + Query → LLM (Gemini/OpenAI)
5. LLM → Contextual Response
```

### 3. Vector Database Structure
- **Collection**: `document_embeddings`
- **Embedding Dimension**: 384 (all-MiniLM-L6-v2)
- **Metadata**: Document ID, page number, chunk index
- **Distance Metric**: Cosine similarity

## 🔧 Configuration

### Key Settings (in `.env`)

```bash
# Required: AI API Key
GOOGLE_API_KEY=your_key_here

# Optional: Performance tuning
EMBEDDING_BATCH_SIZE=10
MAX_CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

### Vector Store Configuration
The system automatically creates a ChromaDB instance in `MEDIA_ROOT/chroma_db/`. No additional configuration needed.

## 📊 Performance Considerations

### Embedding Generation
- ~1-2 seconds per page on average hardware
- Memory usage: ~500MB for model loading
- Batch processing for efficiency

### Search Performance
- Sub-second search response times
- Scales to thousands of documents
- Automatic similarity threshold filtering

## 🧪 Testing

Run the comprehensive test suite:

```bash
python test_rag.py
```

This tests:
- Embedding model loading
- ChromaDB functionality
- Vector store operations
- End-to-end RAG pipeline

## 🚀 Frontend Integration

The frontend can interact with the RAG system through the provided API endpoints. Example usage:

```javascript
// Upload and process document
const uploadDoc = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/reader/upload/', {
    method: 'POST',
    body: formData
  });
  return response.json();
};

// Semantic search
const searchDocs = async (query, documentIds) => {
  const response = await fetch('/api/reader/search/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query,
      document_ids: documentIds,
      top_k: 5
    })
  });
  return response.json();
};

// RAG Chat
const ragChat = async (query, documentIds, history) => {
  const response = await fetch('/api/reader/chat/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query,
      document_ids: documentIds,
      chat_history: history
    })
  });
  return response.json();
};
```

## 🎓 Educational Benefits

This implementation demonstrates:

1. **Modern RAG Architecture**: Industry-standard approach to document Q&A
2. **Local-First Design**: No external dependencies for core functionality
3. **Scalable Vector Search**: ChromaDB provides production-ready vector operations
4. **Efficient Embeddings**: Optimized sentence transformers for semantic understanding
5. **Contextual AI**: LLM responses grounded in document content

## 🔍 Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all packages are installed in the virtual environment
2. **API Key Issues**: Verify your Google AI API key is set correctly
3. **Memory Issues**: Reduce batch size or use smaller embedding models
4. **Slow Performance**: Consider upgrading hardware or optimizing chunk size

### Debug Mode
Set `DEBUG=True` in `.env` for detailed error logging.

## 📈 Next Steps

- Add support for more document formats (Word, PowerPoint)
- Implement document summarization
- Add citation tracking for responses
- Multi-language support
- Advanced query understanding

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

This project is for educational purposes. Check individual package licenses for commercial use.
