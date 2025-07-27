#!/usr/bin/env python
"""
Test script for the RAG system
Run this after setting up the environment to test the vector database functionality
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.vector_service import VectorStoreService, RAGService

def test_vector_store():
    """Test basic vector store functionality."""
    print("Testing Vector Store Service...")
    
    try:
        # Initialize the vector store
        vector_service = VectorStoreService()
        print("✓ Vector store initialized successfully")
        
        # Test sample documents
        sample_docs = [
            {
                'page_number': 1,
                'content': 'Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience.'
            },
            {
                'page_number': 2, 
                'content': 'Neural networks are computing systems inspired by biological neural networks that constitute animal brains.'
            }
        ]
        
        # Create embeddings
        chunks = vector_service.create_embeddings("test-doc-123", sample_docs)
        print(f"✓ Created {len(chunks)} embeddings successfully")
        
        # Test semantic search
        results = vector_service.semantic_search("What is machine learning?")
        print(f"✓ Semantic search returned {len(results)} results")
        
        if results:
            print(f"  - Top result similarity: {results[0]['similarity_score']:.3f}")
            print(f"  - Content preview: {results[0]['content'][:50]}...")
        
        # Test RAG service
        rag_service = RAGService(vector_service)
        context = rag_service.get_context_for_query("artificial intelligence")
        print(f"✓ RAG context generation successful ({len(context)} characters)")
        
        # Get collection stats
        stats = vector_service.get_collection_stats()
        print(f"✓ Collection stats: {stats}")
        
        # Cleanup test data
        vector_service.delete_document_embeddings("test-doc-123")
        print("✓ Test data cleaned up")
        
        print("\n🎉 All vector store tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_embedding_model():
    """Test if the embedding model can be loaded."""
    print("\nTesting Embedding Model...")
    
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Test encoding
        test_text = "This is a test sentence for embedding."
        embedding = model.encode(test_text)
        print(f"✓ Embedding model loaded successfully")
        print(f"✓ Generated embedding with dimension: {len(embedding)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Embedding model test failed: {str(e)}")
        return False

def test_chromadb():
    """Test ChromaDB functionality."""
    print("\nTesting ChromaDB...")
    
    try:
        import chromadb
        from chromadb.config import Settings
        
        # Test basic ChromaDB functionality
        client = chromadb.Client()
        collection = client.create_collection("test_collection")
        
        # Add a test document
        collection.add(
            documents=["This is a test document"],
            metadatas=[{"source": "test"}],
            ids=["test_id"]
        )
        
        # Query the collection
        results = collection.query(
            query_texts=["test document"],
            n_results=1
        )
        
        print("✓ ChromaDB basic functionality working")
        
        # Cleanup
        client.delete_collection("test_collection")
        print("✓ ChromaDB test cleanup complete")
        
        return True
        
    except Exception as e:
        print(f"❌ ChromaDB test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== RAG System Test Suite ===\n")
    
    tests = [
        test_embedding_model,
        test_chromadb,
        test_vector_store
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print(f"=== Test Results: {passed}/{total} tests passed ===")
    
    if passed == total:
        print("🎉 All tests passed! Your RAG system is ready to use.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please check the error messages above.")
        sys.exit(1)
