#!/usr/bin/env python
"""
Test the semantic search functionality
"""
import os
import sys
import django

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.models import Document
from reader.vector_service import VectorStoreService, RAGService

def test_search():
    """Test semantic search on your documents"""
    print("🔍 Testing Semantic Search")
    print("=" * 40)
    
    # Initialize services
    vector_service = VectorStoreService()
    rag_service = RAGService()
    
    # Test queries
    test_queries = [
        "What is redox titration?",
        "How does aquametry work?",
        "What are the main topics discussed in these documents?"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Query: {query}")
        print("-" * 30)
        
        try:
            # Test semantic search (use correct parameter name)
            results = vector_service.semantic_search(query, top_k=3)
            
            if results:
                print(f"✅ Found {len(results)} relevant chunks:")
                for i, result in enumerate(results, 1):
                    print(f"   {i}. Score: {result['score']:.3f}")
                    print(f"      Document: {result['document_title']}")
                    print(f"      Page: {result['page_number']}")
                    print(f"      Text: {result['text'][:150]}...")
                    print()
            else:
                print("❌ No results found")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    # Test enhanced search
    print("\n🔍 Testing Enhanced Search")
    print("=" * 40)
    
    try:
        enhanced_results = rag_service.enhanced_search("redox titration")
        print(f"✅ Enhanced search results:")
        print(f"   Total results: {enhanced_results['total_results']}")
        if enhanced_results['semantic_results']:
            for i, result in enumerate(enhanced_results['semantic_results'][:3], 1):
                print(f"   {i}. {result['document_title']} - Page {result['page_number']}")
                print(f"      {result['text'][:100]}...")
    except Exception as e:
        print(f"❌ Enhanced Search Error: {str(e)}")
    
    # Test context generation
    print("\n📄 Testing Context Generation")
    print("=" * 40)
    
    try:
        context = rag_service.get_context_for_query("redox titration")
        print(f"✅ Generated context ({len(context)} chars):")
        print(f"   {context[:200]}...")
    except Exception as e:
        print(f"❌ Context Error: {str(e)}")

if __name__ == "__main__":
    test_search()
