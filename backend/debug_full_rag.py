#!/usr/bin/env python3
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/home/muse-matrix/Desktop/Mentora/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.utils import PDFProcessor
import uuid

def normalize_uuid(uuid_value):
    """
    Normalize UUID to standard string format with dashes.
    Handles both UUID objects and string representations.
    """
    if isinstance(uuid_value, uuid.UUID):
        return str(uuid_value)
    elif isinstance(uuid_value, str):
        # Remove any existing dashes and recreate with proper format
        clean_uuid = uuid_value.replace('-', '')
        if len(clean_uuid) == 32:
            # Insert dashes at proper positions: 8-4-4-4-12
            return f"{clean_uuid[:8]}-{clean_uuid[8:12]}-{clean_uuid[12:16]}-{clean_uuid[16:20]}-{clean_uuid[20:]}"
    return str(uuid_value)

def test_full_rag():
    print("=== Testing Full RAG Response ===\n")
    
    pdf_processor = PDFProcessor()
    
    test_question = "What are the advantages mentioned in the documents?"
    # Use the UUIDs without dashes (as they come from Django models) and normalize them
    raw_document_ids = ["277f1cd3db6b4b278c4240e1c43261a9", "a8b40a897ede40cfb8027f840218b4f3"]
    document_ids = [normalize_uuid(doc_id) for doc_id in raw_document_ids]
    
    print(f"Testing question: '{test_question}'")
    print(f"Document IDs: {document_ids}")
    
    try:
        response = pdf_processor.rag_chat_response(
            query=test_question,
            document_ids=document_ids,
            chat_history=[]
        )
        print(f"\nRAG Response length: {len(response)}")
        print(f"RAG Response: {response}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_full_rag()
