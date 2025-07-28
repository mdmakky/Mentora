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
import json

def debug_vector_service():
    print("=== Debugging Vector Service Structure ===\n")
    
    vector_service = VectorStoreService()
    test_query = "What are the advantages?"
    
    print(f"Testing query: '{test_query}'")
    
    try:
        results = vector_service.semantic_search(query=test_query, top_k=2)
        print(f"Search returned {len(results)} results")
        print("Full result structure:")
        
        for i, result in enumerate(results):
            print(f"\n--- Result {i+1} ---")
            print("Keys in result:", list(result.keys()))
            
            for key, value in result.items():
                if isinstance(value, dict):
                    print(f"{key}: (dict) {list(value.keys())}")
                    for sub_key, sub_value in value.items():
                        print(f"  {sub_key}: {type(sub_value).__name__} - {str(sub_value)[:100]}")
                else:
                    print(f"{key}: {type(value).__name__} - {str(value)[:100]}")
        
        # Test context generation
        print(f"\n=== Testing Context Generation ===")
        
        # Create RAGService and test context generation
        from reader.vector_service import RAGService
        rag_service = RAGService(vector_service)
        context = rag_service.get_context_for_query(test_query, max_context_length=500)
        print(f"Generated context (length: {len(context)}):")
        print(context)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_vector_service()
