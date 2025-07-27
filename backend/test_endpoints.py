#!/usr/bin/env python
"""
Test document viewing endpoints
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
import requests

def test_document_endpoints():
    """Test if document endpoints are working"""
    print("🔍 Testing Document Viewing Endpoints")
    print("=" * 50)
    
    # Get documents
    documents = Document.objects.all()
    print(f"📚 Found {documents.count()} documents")
    
    for doc in documents:
        print(f"\n📄 Testing: {doc.title}")
        print(f"   ID: {doc.id}")
        print(f"   File path: {doc.file.path}")
        print(f"   File exists: {os.path.exists(doc.file.path)}")
        
        # Test file access
        if os.path.exists(doc.file.path):
            file_size = os.path.getsize(doc.file.path)
            print(f"   File size: {file_size} bytes")
            
            # Test if file is readable
            try:
                with open(doc.file.path, 'rb') as f:
                    first_bytes = f.read(10)
                    print(f"   ✅ File readable: {first_bytes[:4] == b'%PDF'}")
            except Exception as e:
                print(f"   ❌ File read error: {e}")
        else:
            print(f"   ❌ File missing!")
        
        # Print the correct URLs
        print(f"   📋 Endpoints:")
        print(f"      File URL: /api/documents/{doc.id}/file/")
        print(f"      Summary URL: /api/documents/{doc.id}/summary/")
        print(f"      Status URL: /api/documents/{doc.id}/status/")
    
    print("\n🛠️  Frontend Integration:")
    print("   Make sure your frontend is calling:")
    print("   GET /api/documents/{document_id}/file/")
    print("   for PDF viewing")
    
    print("\n🔧 Quick Fix Test:")
    print("   Try accessing in browser:")
    for doc in documents[:1]:  # Just show first document
        print(f"   http://localhost:8000/api/documents/{doc.id}/file/")
        break

if __name__ == "__main__":
    test_document_endpoints()
