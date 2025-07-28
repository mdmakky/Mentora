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

def test_context_generation():
    print("=== Testing Context Generation with Debug ===\n")
    
    vector_service = VectorStoreService()
    rag_service = RAGService(vector_service)
    
    test_query = "What are the advantages?"
    print(f"Testing query: '{test_query}'")
    
    # Get search results first
    search_results = rag_service.enhanced_search(test_query)
    print(f"Enhanced search returned {len(search_results['semantic_results'])} results")
    
    for i, result in enumerate(search_results['semantic_results'][:5]):
        content = result['content'].strip()
        print(f"Result {i+1}: Length={len(content)}, Content='{content[:100]}...'")
    
    # Test context generation
    context = rag_service.get_context_for_query(test_query, max_context_length=3000)
    print(f"\nGenerated context length: {len(context)}")
    print(f"Generated context:\n{context}")

if __name__ == "__main__":
    test_context_generation()
