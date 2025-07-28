#!/usr/bin/env python3
"""
Debug RAG system to see why it's giving irrelevant responses
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/home/muse-matrix/Desktop/Mentora/backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.utils import PDFProcessor
from reader.models import Document

def test_rag_system():
    print("=== RAG System Debug Test ===\n")
    
    # Initialize processor
    processor = PDFProcessor()
    
    # Get available documents
    documents = Document.objects.all()
    print(f"Available documents ({len(documents)}):")
    for doc in documents:
        print(f"  - {doc.title} (ID: {doc.id})")
    print()
    
    if not documents:
        print("❌ No documents found! Upload some documents first.")
        return
    
    # Test queries
    test_queries = [
        "What are the advantages of aquametry?",
        "Tell me about business communication",
        "What is redox titration?",
        "Explain linear regression"  # This should fallback to general knowledge
    ]
    
    document_ids = [str(doc.id) for doc in documents]
    
    for query in test_queries:
        print(f"🔍 Testing query: '{query}'")
        print("-" * 50)
        
        # Test context retrieval
        try:
            context = processor.rag_service.get_context_for_query(query, document_ids)
            print(f"📄 Context retrieved ({len(context)} chars):")
            if context.strip():
                print(f"   Preview: {context[:200]}...")
            else:
                print("   ❌ No context found")
        except Exception as e:
            print(f"   ❌ Context retrieval failed: {e}")
            context = ""
        
        # Test full RAG response
        try:
            response = processor.rag_chat_response(query, document_ids)
            print(f"🤖 AI Response ({len(response)} chars):")
            print(f"   {response[:300]}...")
        except Exception as e:
            print(f"   ❌ RAG response failed: {e}")
        
        print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    test_rag_system()
