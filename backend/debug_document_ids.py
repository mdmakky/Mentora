#!/usr/bin/env python3
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/home/muse-matrix/Desktop/Mentora/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.vector_service import VectorStoreService, RAGService

def test_with_document_ids():
    print("=== Testing Context with Document IDs ===\n")
    
    vector_service = VectorStoreService()
    rag_service = RAGService(vector_service)
    
    test_query = "What are the advantages?"
    document_ids = ["277f1cd3-db6b-4b27-8c42-40e1c43261a9", "a8b40a89-7ede-40cf-b802-7f840218b4f3"]
    
    print(f"Testing query: '{test_query}'")
    print(f"With document IDs: {document_ids}")
    
    # Test 1: Without document IDs
    print("\n--- Test 1: Without document IDs ---")
    context1 = rag_service.get_context_for_query(test_query, max_context_length=1000)
    print(f"Context length: {len(context1)}")
    print(f"Context preview: {context1[:200]}...")
    
    # Test 2: With document IDs
    print("\n--- Test 2: With document IDs ---")
    context2 = rag_service.get_context_for_query(test_query, document_ids, max_context_length=1000)
    print(f"Context length: {len(context2)}")
    print(f"Context preview: {context2[:200]}...")
    
    # Test 3: Check what the enhanced search returns with document IDs
    print("\n--- Test 3: Enhanced search with document IDs ---")
    search_results = rag_service.enhanced_search(test_query, document_ids)
    print(f"Search results count: {len(search_results['semantic_results'])}")
    for i, result in enumerate(search_results['semantic_results'][:3]):
        doc_id = result['metadata']['document_id']
        print(f"Result {i+1}: doc_id={doc_id}, content_length={len(result['content'])}")

if __name__ == "__main__":
    test_with_document_ids()
