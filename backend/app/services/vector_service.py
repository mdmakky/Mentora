"""
Vector Service
Handles document vectorization and semantic search using ChromaDB
"""

import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional
from app.core.config import settings


class VectorService:
    """Service for managing document vectors and semantic search"""
    
    def __init__(self):
        """Initialize ChromaDB client"""
        # Create persistent ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(settings.VECTOR_DB_PATH),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection for documents
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"description": "User document embeddings"}
        )
    
    async def add_document(
        self,
        document_id: str,
        pages: List[Dict[str, any]],
        user_id: int
    ) -> bool:
        """
        Add document pages to vector database
        
        Args:
            document_id: ID of the document (UUID string)
            pages: List of page dictionaries with 'page_number' and 'content'
            user_id: ID of the user who owns the document
            
        Returns:
            True if successful
        """
        try:
            # Prepare data for ChromaDB
            ids = []
            documents = []
            metadatas = []
            
            for page in pages:
                # Create unique ID for this page
                page_id = f"doc_{document_id}_page_{page['page_number']}"
                
                # Skip empty pages
                if not page['content'] or not page['content'].strip():
                    continue
                
                ids.append(page_id)
                documents.append(page['content'])
                metadatas.append({
                    "document_id": document_id,
                    "page_number": page['page_number'],
                    "user_id": user_id
                })
            
            # Add to ChromaDB
            if ids:
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
                
                print(f"✅ Vectorized {len(ids)} pages for document {document_id}")
                return True
            else:
                print(f"⚠️ No content to vectorize for document {document_id}")
                return False
                
        except Exception as e:
            print(f"❌ Error vectorizing document {document_id}: {e}")
            return False
    
    async def search(
        self,
        query: str,
        user_id: int,
        document_ids: Optional[List[str]] = None,
        n_results: int = 5
    ) -> List[Dict]:
        """
        Search for relevant document chunks
        
        Args:
            query: Search query
            user_id: User ID to filter results
            document_ids: Optional list of document IDs (UUID strings) to search within
            n_results: Number of results to return
            
        Returns:
            List of matching chunks with metadata
        """
        try:
            # Build where filter
            where_filter = {"user_id": user_id}
            
            if document_ids:
                # ChromaDB requires $in operator for lists
                where_filter["document_id"] = {"$in": document_ids}
            
            # Query ChromaDB
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter
            )
            
            # Format results
            formatted_results = []
            if results and results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    formatted_results.append({
                        "content": results['documents'][0][i],
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i] if 'distances' in results else None
                    })
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Error searching vectors: {e}")
            return []
    
    async def delete_document(self, document_id: str) -> bool:
        """
        Delete all vectors for a document
        
        Args:
            document_id: Document ID (UUID string) to delete
            
        Returns:
            True if successful
        """
        try:
            # Get all IDs for this document
            results = self.collection.get(
                where={"document_id": document_id}
            )
            
            if results and results['ids']:
                self.collection.delete(ids=results['ids'])
                print(f"✅ Deleted vectors for document {document_id}")
                return True
            else:
                print(f"⚠️ No vectors found for document {document_id}")
                return False
                
        except Exception as e:
            print(f"❌ Error deleting vectors for document {document_id}: {e}")
            return False


# Singleton instance
_vector_service = None

def get_vector_service() -> VectorService:
    """Get or create vector service instance"""
    global _vector_service
    if _vector_service is None:
        _vector_service = VectorService()
    return _vector_service
