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
import uuid

def normalize_uuid(uuid_value):
    """
    Normalize UUID to standard string format with dashes.
    """
    if isinstance(uuid_value, uuid.UUID):
        return str(uuid_value)
    elif isinstance(uuid_value, str):
        clean_uuid = uuid_value.replace('-', '')
        if len(clean_uuid) == 32:
            return f"{clean_uuid[:8]}-{clean_uuid[8:12]}-{clean_uuid[12:16]}-{clean_uuid[16:20]}-{clean_uuid[20:]}"
    return str(uuid_value)

def test_final_fix():
    print("=== Testing Fixed RAG Context Retrieval ===\n")
    
    vector_service = VectorStoreService()
    rag_service = RAGService(vector_service)
    
    test_query = "What are the advantages mentioned in business communication?"
    # Use Django-style UUIDs and normalize them
    raw_document_ids = ["277f1cd3db6b4b278c4240e1c43261a9", "a8b40a897ede40cfb8027f840218b4f3"]
    document_ids = [normalize_uuid(doc_id) for doc_id in raw_document_ids]
    
    print(f"Testing query: '{test_query}'")
    print(f"Raw document IDs: {raw_document_ids}")
    print(f"Normalized document IDs: {document_ids}")
    
    # Test context generation
    context = rag_service.get_context_for_query(test_query, document_ids, max_context_length=2000)
    print(f"\nContext retrieved: {len(context)} characters")
    print(f"Context found: {'Yes' if len(context) > 50 else 'No'}")
    
    if context:
        print(f"\nContext preview:\n{context[:500]}...")
    else:
        print("\nNo context retrieved!")

if __name__ == "__main__":
    test_final_fix()
