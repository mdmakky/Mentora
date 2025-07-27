#!/usr/bin/env python
"""
Manual reprocessing script for fixing uploaded documents
"""
import os
import sys
import django

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

from reader.models import Document, Page, DocumentChunk
from reader.utils import PDFProcessor
import traceback

def reprocess_document(document):
    """Reprocess a single document with full error details"""
    print(f"\n🔄 Reprocessing: {document.title}")
    print(f"   File: {document.file.path}")
    print(f"   Current status: processed={document.is_processed}, embedded={document.is_embedded}")
    
    try:
        # Clear existing data
        document.pages.all().delete()
        document.chunks.all().delete()
        
        processor = PDFProcessor()
        
        # Step 1: Extract text
        print("   Step 1: Extracting text...")
        pdf_data = processor.extract_pdf_text(document.file.path)
        print(f"   ✅ Extracted {len(pdf_data['pages'])} pages")
        
        # Step 2: Update document
        print("   Step 2: Updating document record...")
        document.total_pages = pdf_data['total_pages']
        document.is_processed = True
        document.save()
        print(f"   ✅ Document updated: {document.total_pages} pages")
        
        # Step 3: Create page records
        print("   Step 3: Creating page records...")
        pages_data = []
        for page_data in pdf_data['pages']:
            page = Page.objects.create(
                document=document,
                page_number=page_data['page_number'],
                content=page_data['content']
            )
            pages_data.append({
                'page_number': page.page_number,
                'content': page.content,
                'page_id': page.id
            })
        print(f"   ✅ Created {len(pages_data)} page records")
        
        # Step 4: Create embeddings
        print("   Step 4: Creating embeddings...")
        chunks_data = processor.process_document_with_embeddings(
            str(document.id), 
            pages_data
        )
        print(f"   ✅ Generated {len(chunks_data)} chunks")
        
        # Step 5: Save chunks
        print("   Step 5: Saving chunks to database...")
        for chunk_data in chunks_data:
            page = Page.objects.get(
                document=document, 
                page_number=chunk_data['page_number']
            )
            DocumentChunk.objects.create(
                document=document,
                page=page,
                chunk_text=chunk_data['chunk_text'],
                chunk_index=chunk_data['chunk_index'],
                start_char=chunk_data['start_char'],
                end_char=chunk_data['end_char'],
                embedding_id=chunk_data['embedding_id']
            )
        print(f"   ✅ Saved {len(chunks_data)} chunks to database")
        
        # Step 6: Mark as embedded
        print("   Step 6: Marking as embedded...")
        document.is_embedded = True
        
        # Step 7: Detect topics
        print("   Step 7: Detecting topics...")
        topics = processor.detect_topics(pdf_data['full_text'])
        document.topics = topics
        document.save()
        print(f"   ✅ Detected topics: {topics}")
        
        print(f"   🎉 SUCCESS: {document.title} fully processed!")
        return True
        
    except Exception as e:
        print(f"   ❌ ERROR processing {document.title}:")
        print(f"   {str(e)}")
        print(f"   Traceback:")
        traceback.print_exc()
        return False

def main():
    print("🔄 Manual Document Reprocessing")
    print("=" * 40)
    
    # Get all documents that need reprocessing
    documents = Document.objects.all()
    print(f"Found {documents.count()} documents to process")
    
    success_count = 0
    failed_count = 0
    
    for doc in documents:
        if reprocess_document(doc):
            success_count += 1
        else:
            failed_count += 1
    
    print("\n" + "=" * 40)
    print(f"📊 Processing Complete!")
    print(f"   ✅ Success: {success_count}")
    print(f"   ❌ Failed: {failed_count}")
    
    # Final status check
    print("\n📋 Final Status:")
    for doc in Document.objects.all():
        chunk_count = doc.chunks.count()
        page_count = doc.pages.count()
        print(f"   📄 {doc.title}")
        print(f"      Processed: {doc.is_processed}, Embedded: {doc.is_embedded}")
        print(f"      Pages: {page_count}, Chunks: {chunk_count}")

if __name__ == "__main__":
    main()
