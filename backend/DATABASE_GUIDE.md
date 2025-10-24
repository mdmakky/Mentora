# Database Architecture Guide for Mentora

## Current Setup ✅ (Recommended for Development)

### 1. SQLite Database (`/data/database/mentora.db`)
**Purpose**: Store structured metadata
- User accounts and profiles
- Document metadata (not the files themselves!)
- Chat session information
- Study analytics and statistics

**Why SQLite is Good Here**:
- Zero configuration
- Perfect for single-user or small deployments
- Easy to backup (just copy the .db file)
- Fast for <100k records
- Great for learning and development

### 2. Filesystem Storage (`/data/media/`)
**Purpose**: Store large binary files
- PDF documents → `/data/media/documents/`
- User avatars → `/data/media/avatars/`

**Why Not in Database**:
- Files are large (PDFs can be 10-100 MB)
- Databases slow down with BLOBs
- Easier to serve directly via FastAPI
- Simpler backups
- Better performance

### 3. ChromaDB (`/data/vector_db/chroma_db/`)
**Purpose**: Store vector embeddings for AI similarity search
- Document text embeddings
- Semantic search capabilities
- RAG (Retrieval Augmented Generation) support

**Why Separate from SQLite**:
- Specialized for vector operations
- Optimized for cosine similarity
- Built for AI/ML workloads
- Better performance than general-purpose DB

---

## Data Flow Example

### When User Uploads PDF:
```
1. User uploads PDF via frontend
2. FastAPI receives file → saves to /data/media/documents/user123_doc.pdf
3. Extract text from PDF
4. Create embedding vectors → store in ChromaDB
5. Save metadata to SQLite:
   {
     id: "uuid-123",
     user_id: 45,
     title: "Machine Learning Notes",
     file_path: "/data/media/documents/user123_doc.pdf",
     total_pages: 50,
     file_size: 2048000,
     is_processed: true,
     is_embedded: true
   }
```

### When AI Answers Question:
```
1. User asks: "What are neural networks?"
2. Create embedding of question
3. ChromaDB finds similar document chunks
4. SQLite provides document metadata
5. Gemini generates answer using context
6. Save chat message to SQLite
```

---

## When to Upgrade to PostgreSQL

### Migrate when you experience:
- [ ] More than 50 concurrent users
- [ ] Database locks/slowdowns
- [ ] Need for advanced queries (JSON, full-text search)
- [ ] Production deployment
- [ ] Team collaboration
- [ ] Need for database replication

### How to Migrate (when needed):
SQLite → PostgreSQL is easy with your current setup:

1. Change `.env`:
   ```bash
   # From:
   DATABASE_URL=sqlite+aiosqlite:////path/to/mentora.db
   
   # To:
   DATABASE_URL=postgresql+asyncpg://user:pass@localhost/mentora
   ```

2. Install dependencies:
   ```bash
   pip install asyncpg psycopg2-binary
   ```

3. Run migrations:
   ```bash
   alembic upgrade head
   ```

Your file storage and ChromaDB stay the same! ✅

---

## Storage Size Estimates

### For 100 Users:
- **SQLite**: ~50-100 MB (metadata only)
- **PDFs**: ~5-10 GB (50-100 MB per user)
- **ChromaDB**: ~500 MB - 2 GB (embeddings)
- **Total**: ~6-12 GB

### For 1000 Users:
- **SQLite**: ~500 MB - 1 GB
- **PDFs**: ~50-100 GB
- **ChromaDB**: ~5-20 GB
- **Total**: ~55-120 GB

---

## Current Limitations & Solutions

| Limitation | Impact | Solution (if needed) |
|------------|--------|---------------------|
| SQLite locks on concurrent writes | Minimal for <50 users | Use PostgreSQL for >100 users |
| No built-in vector search in SQLite | None - using ChromaDB ✅ | Keep ChromaDB |
| File storage not CDN-enabled | Slower for remote users | Add Cloudflare R2/S3 later |
| No automatic backups | Manual backup needed | Add backup script |

---

## Backup Strategy

### Daily Backup Script:
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mentora_$DATE"

mkdir -p $BACKUP_DIR

# Backup SQLite
cp /data/database/mentora.db $BACKUP_DIR/

# Backup files
rsync -av /data/media/ $BACKUP_DIR/media/

# Backup ChromaDB
rsync -av /data/vector_db/ $BACKUP_DIR/vector_db/

# Compress
tar -czf mentora_backup_$DATE.tar.gz $BACKUP_DIR/
```

---

## Recommendation for You

### ✅ KEEP CURRENT SETUP because:
1. You're learning and developing
2. Perfect separation of concerns
3. Industry best practice for file storage
4. Scalable when needed
5. Simple to understand and maintain

### 📝 Consider Later (when in production):
1. Add PostgreSQL for user data (easy migration)
2. Add S3/R2 for file storage (if needed for CDN)
3. Keep ChromaDB for vectors (it's already optimal)

---

## Your Architecture is EXCELLENT! 🎉

The way you've separated:
- Metadata → SQLite ✅
- Files → Filesystem ✅  
- Vectors → ChromaDB ✅

This is exactly how professional applications work. Don't change it unless you need to scale to hundreds of concurrent users!

