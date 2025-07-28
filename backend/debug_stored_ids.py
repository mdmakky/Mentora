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

def check_stored_document_ids():
    print("=== Checking Stored Document IDs ===\n")
    
    vector_service = VectorStoreService()
    
    # Get all data from the collection to see what document IDs are stored
    try:
        results = vector_service.collection.get(
            include=["metadatas"]
        )
        
        print(f"Total embeddings in collection: {len(results['ids'])}")
        
        # Get unique document IDs
        document_ids = set()
        for metadata in results['metadatas']:
            doc_id = metadata.get('document_id')
            if doc_id:
                document_ids.add(doc_id)
        
        print(f"\nUnique document IDs found in vector store:")
        for doc_id in sorted(document_ids):
            print(f"  - {doc_id}")
        
        # Show first few embeddings with their metadata
        print(f"\nFirst 3 embeddings with metadata:")
        for i in range(min(3, len(results['ids']))):
            print(f"Embedding {i+1}:")
            print(f"  ID: {results['ids'][i]}")
            print(f"  Metadata: {results['metadatas'][i]}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_stored_document_ids()
