#!/usr/bin/env python
"""
Diagnostic script to check file processing issues
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.models import Document, Page, DocumentChunk
from django.contrib.auth.models import User
import PyPDF2

def check_database():
    """Check database status"""
    print("=== DATABASE STATUS ===")
    
    # Check users
    users = User.objects.all()
    print(f"Users in database: {users.count()}")
    if users.count() == 0:
        print("⚠️  No users found! Creating default user...")
        user = User.objects.create_user(username='admin', email='admin@test.com', password='admin')
        print(f"✅ Created user: {user.username}")
    
    # Check documents
    docs = Document.objects.all()
    print(f"\nDocuments in database: {docs.count()}")
    
    for doc in docs:
        print(f"\n📄 Document: {doc.title}")
        print(f"   ID: {doc.id}")
        print(f"   File: {doc.file.name if doc.file else 'No file'}")
        print(f"   Total pages: {doc.total_pages}")
        print(f"   Is processed: {doc.is_processed}")
        print(f"   Is embedded: {doc.is_embedded}")
        print(f"   Pages count: {doc.pages.count()}")
        print(f"   Chunks count: {doc.chunks.count()}")
        print(f"   Upload date: {doc.upload_date}")
        
        if doc.file and os.path.exists(doc.file.path):
            print(f"   File exists: ✅")
            print(f"   File size: {os.path.getsize(doc.file.path)} bytes")
        else:
            print(f"   File exists: ❌")

def check_media_files():
    """Check media files on disk"""
    print("\n=== MEDIA FILES ===")
    media_path = "/home/muse-matrix/Desktop/Mentora/backend/media/documents"
    
    if os.path.exists(media_path):
        files = os.listdir(media_path)
        print(f"Files in media/documents: {len(files)}")
        
        for file in files:
            file_path = os.path.join(media_path, file)
            size = os.path.getsize(file_path)
            print(f"  📄 {file} ({size} bytes)")
            
            # Try to read PDF
            try:
                with open(file_path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    print(f"     Pages: {len(pdf_reader.pages)}")
                    print(f"     Can read: ✅")
            except Exception as e:
                print(f"     Can read: ❌ Error: {str(e)}")
    else:
        print("❌ Media directory doesn't exist!")

def test_pdf_processing():
    """Test PDF processing with an existing file"""
    print("\n=== PDF PROCESSING TEST ===")
    
    media_path = "/home/muse-matrix/Desktop/Mentora/backend/media/documents"
    files = os.listdir(media_path) if os.path.exists(media_path) else []
    
    if not files:
        print("❌ No files to test")
        return
    
    test_file = files[0]  # Take first file
    file_path = os.path.join(media_path, test_file)
    
    print(f"Testing with: {test_file}")
    
    try:
        # Test basic PDF reading
        print("1. Testing basic PDF reading...")
        with open(file_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            pages = len(pdf_reader.pages)
            print(f"   ✅ PDF has {pages} pages")
        
        # Test text extraction
        print("2. Testing text extraction...")
        with open(file_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            first_page = pdf_reader.pages[0]
            text = first_page.extract_text()
            print(f"   ✅ Extracted {len(text)} characters from first page")
            if text.strip():
                print(f"   Preview: {text[:100]}...")
            else:
                print("   ⚠️  No text extracted (might be image-based PDF)")
        
        # Test sentence transformers
        print("3. Testing embeddings...")
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            embedding = model.encode("test sentence")
            print(f"   ✅ Embeddings working (dimension: {len(embedding)})")
        except Exception as e:
            print(f"   ❌ Embeddings failed: {str(e)}")
        
        # Test ChromaDB
        print("4. Testing ChromaDB...")
        try:
            import chromadb
            client = chromadb.Client()
            print("   ✅ ChromaDB working")
        except Exception as e:
            print(f"   ❌ ChromaDB failed: {str(e)}")
            
    except Exception as e:
        print(f"❌ PDF processing failed: {str(e)}")

def check_api_keys():
    """Check if API keys are configured"""
    print("\n=== API CONFIGURATION ===")
    
    from django.conf import settings
    
    google_key = getattr(settings, 'GOOGLE_API_KEY', None)
    if google_key and google_key != 'your-google-gemini-api-key-here':
        print("✅ Google API key configured")
    else:
        print("❌ Google API key not configured")
    
    openai_key = getattr(settings, 'OPENAI_API_KEY', None)
    if openai_key:
        print("✅ OpenAI API key configured")
    else:
        print("⚠️  OpenAI API key not configured (optional)")

def fix_orphaned_files():
    """Create database entries for orphaned files"""
    print("\n=== FIXING ORPHANED FILES ===")
    
    media_path = "/home/muse-matrix/Desktop/Mentora/backend/media/documents"
    if not os.path.exists(media_path):
        return
    
    files = os.listdir(media_path)
    user = User.objects.first()
    
    if not user:
        print("❌ No user found to assign files to")
        return
    
    for file in files:
        file_path = os.path.join(media_path, file)
        
        # Check if document exists in database
        doc_exists = Document.objects.filter(file__contains=file).exists()
        
        if not doc_exists:
            print(f"📄 Creating database entry for: {file}")
            
            try:
                # Create document record
                doc = Document.objects.create(
                    user=user,
                    title=file.replace('.pdf', ''),
                    file=f'documents/{file}',
                    is_processed=False,
                    is_embedded=False
                )
                
                # Try to get page count
                try:
                    with open(file_path, 'rb') as f:
                        pdf_reader = PyPDF2.PdfReader(f)
                        doc.total_pages = len(pdf_reader.pages)
                        doc.save()
                        print(f"   ✅ Created with {doc.total_pages} pages")
                except:
                    print(f"   ⚠️  Created but couldn't read page count")
                    
            except Exception as e:
                print(f"   ❌ Failed to create: {str(e)}")

if __name__ == "__main__":
    print("🔍 Mentora File Processing Diagnostic")
    print("=====================================")
    
    check_database()
    check_media_files()
    check_api_keys()
    test_pdf_processing()
    
    # Ask if user wants to fix orphaned files
    print("\n" + "="*50)
    answer = input("Do you want to create database entries for orphaned files? (y/n): ")
    if answer.lower().startswith('y'):
        fix_orphaned_files()
        print("\n📊 Updated database status:")
        check_database()
    
    print("\n✅ Diagnostic complete!")
