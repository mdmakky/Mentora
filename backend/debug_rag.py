#!/usr/bin/env python3
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/home/muse-matrix/Desktop/Mentora/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.vector_service import VectorStoreService
from reader.utils import PDFProcessor
import sqlite3

def test_rag_system():
    print("=== Testing RAG System ===\n")
    
    # Test 1: Check if documents are in the database
    print("1. Checking documents in database...")
    db_path = '/home/muse-matrix/Desktop/Mentora/backend/db.sqlite3'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, title, file FROM reader_document")
    documents = cursor.fetchall()
    
    if documents:
        print(f"Found {len(documents)} documents in database:")
        for doc in documents:
            print(f"  - ID: {doc[0]}, Title: {doc[1]}, File: {doc[2]}")
    else:
        print("No documents found in database!")
        return
    
    conn.close()
    
    # Test 2: Check vector store
    print("\n2. Testing vector store service...")
    vector_service = VectorStoreService()
    
    # Test with a sample query
    test_queries = [
        "What are the advantages?",
        "business communication",
        "redox titration",
        "aquametry"
    ]
    
    for query in test_queries:
        print(f"\nTesting query: '{query}'")
        try:
            results = vector_service.semantic_search(query=query, top_k=3)
            print(f"  Found {len(results)} results:")
            for i, result in enumerate(results):
                score = result.get('score', 'N/A')
                if isinstance(score, (int, float)):
                    score_str = f"{score:.3f}"
                else:
                    score_str = str(score)
                print(f"    {i+1}. Score: {score_str}")
                print(f"       Content preview: {result.get('content', '')[:100]}...")
                print(f"       Document: {result.get('document_title', 'Unknown')}")
        except Exception as e:
            print(f"  Error: {e}")
            import traceback
            traceback.print_exc()
    
    # Test 3: Test full RAG pipeline
    print("\n3. Testing full RAG pipeline...")
    pdf_processor = PDFProcessor()
    
    test_question = "What are the advantages mentioned in the documents?"
    print(f"Testing question: '{test_question}'")
    
    try:
        response = pdf_processor.rag_chat_response(
            query=test_question,
            document_ids=[str(doc[0]) for doc in documents],
            chat_history=[]
        )
        print(f"RAG Response: {response[:200]}...")
    except Exception as e:
        print(f"RAG Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_rag_system()
