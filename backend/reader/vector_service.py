import os
import uuid
import numpy as np
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing vector embeddings and semantic search."""
    
    def __init__(self):
        # Initialize the embedding model (local alternative to AWS Bedrock)
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ChromaDB (local alternative to AWS RDS for vectors)
        self.chroma_db_path = os.path.join(settings.MEDIA_ROOT, 'chroma_db')
        os.makedirs(self.chroma_db_path, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=self.chroma_db_path,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="document_embeddings",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Text splitter for creating chunks
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len,
            separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""]
        )
    
    def create_embeddings(self, document_id: str, pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Create embeddings for document pages and store in vector database.
        
        Args:
            document_id: UUID of the document
            pages_data: List of page data with content
            
        Returns:
            List of chunk data with embedding IDs
        """
        all_chunks = []
        
        try:
            for page_data in pages_data:
                page_number = page_data['page_number']
                content = page_data['content']
                
                if not content.strip():
                    continue
                
                # Split page content into chunks
                chunks = self.text_splitter.split_text(content)
                
                for i, chunk_text in enumerate(chunks):
                    if len(chunk_text.strip()) < 20:  # Skip very small chunks
                        continue
                    
                    # Create unique embedding ID
                    embedding_id = f"{document_id}_page_{page_number}_chunk_{i}"
                    
                    # Generate embedding
                    embedding = self.embedding_model.encode(chunk_text).tolist()
                    
                    # Create metadata
                    metadata = {
                        "document_id": document_id,
                        "page_number": page_number,
                        "chunk_index": i,
                        "content_length": len(chunk_text)
                    }
                    
                    # Add to ChromaDB
                    self.collection.add(
                        embeddings=[embedding],
                        documents=[chunk_text],
                        metadatas=[metadata],
                        ids=[embedding_id]
                    )
                    
                    # Calculate character positions (approximate)
                    start_char = content.find(chunk_text)
                    end_char = start_char + len(chunk_text) if start_char != -1 else len(chunk_text)
                    
                    chunk_data = {
                        'embedding_id': embedding_id,
                        'chunk_text': chunk_text,
                        'chunk_index': i,
                        'page_number': page_number,
                        'start_char': max(0, start_char),
                        'end_char': end_char
                    }
                    
                    all_chunks.append(chunk_data)
                    
            logger.info(f"Created {len(all_chunks)} embeddings for document {document_id}")
            return all_chunks
            
        except Exception as e:
            logger.error(f"Error creating embeddings for document {document_id}: {str(e)}")
            raise
    
    def semantic_search(
        self, 
        query: str, 
        document_ids: List[str] = None, 
        top_k: int = 5,
        similarity_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search across document embeddings.
        
        Args:
            query: Search query
            document_ids: Optional list of document IDs to search within
            top_k: Number of top results to return
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of search results with metadata
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode(query).tolist()
            
            # Prepare where clause for filtering by documents
            where_clause = None
            if document_ids:
                where_clause = {"document_id": {"$in": document_ids}}
            
            # Perform search
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause,
                include=["documents", "metadatas", "distances"]
            )
            
            # Process results
            search_results = []
            for i in range(len(results['ids'][0])):
                distance = results['distances'][0][i]
                similarity = 1 - distance  # Convert distance to similarity
                
                if similarity >= similarity_threshold:
                    result = {
                        'embedding_id': results['ids'][0][i],
                        'content': results['documents'][0][i],
                        'similarity_score': similarity,
                        'metadata': results['metadatas'][0][i]
                    }
                    search_results.append(result)
            
            return search_results
            
        except Exception as e:
            logger.error(f"Error in semantic search: {str(e)}")
            return []
    
    def get_similar_chunks(
        self, 
        document_id: str, 
        chunk_text: str, 
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Find similar chunks within the same document.
        """
        try:
            query_embedding = self.embedding_model.encode(chunk_text).tolist()
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k + 1,  # +1 to exclude the exact match
                where={"document_id": document_id},
                include=["documents", "metadatas", "distances"]
            )
            
            similar_chunks = []
            for i in range(len(results['ids'][0])):
                # Skip if it's the same chunk
                if results['documents'][0][i] == chunk_text:
                    continue
                    
                similarity = 1 - results['distances'][0][i]
                if similarity > 0.5:  # Only return fairly similar chunks
                    similar_chunks.append({
                        'content': results['documents'][0][i],
                        'similarity_score': similarity,
                        'metadata': results['metadatas'][0][i]
                    })
            
            return similar_chunks[:top_k]
            
        except Exception as e:
            logger.error(f"Error finding similar chunks: {str(e)}")
            return []
    
    def delete_document_embeddings(self, document_id: str):
        """
        Delete all embeddings for a specific document.
        """
        try:
            # Get all embeddings for the document
            results = self.collection.get(
                where={"document_id": document_id},
                include=["embeddings"]
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                logger.info(f"Deleted {len(results['ids'])} embeddings for document {document_id}")
                
        except Exception as e:
            logger.error(f"Error deleting embeddings for document {document_id}: {str(e)}")
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the vector collection.
        """
        try:
            count = self.collection.count()
            return {
                'total_embeddings': count,
                'collection_name': self.collection.name,
                'embedding_dimension': 384  # all-MiniLM-L6-v2 dimension
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {'total_embeddings': 0}


class RAGService:
    """Service for Retrieval Augmented Generation."""
    
    def __init__(self, vector_store: VectorStoreService = None):
        self.vector_store = vector_store or VectorStoreService()
    
    def enhanced_search(
        self, 
        query: str, 
        document_ids: List[str] = None,
        search_type: str = "semantic"
    ) -> Dict[str, Any]:
        """
        Enhanced search combining semantic search with traditional methods.
        
        Args:
            query: Search query
            document_ids: Optional document IDs to search within
            search_type: "semantic", "keyword", or "hybrid"
        """
        results = {
            'semantic_results': [],
            'query': query,
            'total_results': 0
        }
        
        if search_type in ["semantic", "hybrid"]:
            # Semantic search
            semantic_results = self.vector_store.semantic_search(
                query=query,
                document_ids=document_ids,
                top_k=10
            )
            results['semantic_results'] = semantic_results
            results['total_results'] += len(semantic_results)
        
        return results
    
    def get_context_for_query(
        self, 
        query: str, 
        document_ids: List[str] = None,
        max_context_length: int = 2000
    ) -> str:
        """
        Get relevant context for a query to use with LLM.
        """
        search_results = self.enhanced_search(query, document_ids)
        
        context_parts = []
        current_length = 0
        
        for result in search_results['semantic_results']:
            content = result['content']
            metadata = result['metadata']
            
            # Format context with source information
            formatted_content = f"[Page {metadata['page_number']}]: {content}"
            
            if current_length + len(formatted_content) > max_context_length:
                break
                
            context_parts.append(formatted_content)
            current_length += len(formatted_content)
        
        return "\n\n".join(context_parts)
