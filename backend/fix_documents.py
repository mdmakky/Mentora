#!/usr/bin/env python
"""
Quick fix to mark documents as embedded and add basic topics
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

def fix_documents():
    """Mark all documents as embedded and add basic topics"""
    print("🔧 Fixing document status...")
    
    documents = Document.objects.all()
    
    for doc in documents:
        # Mark as embedded since chunks exist
        if doc.chunks.count() > 0:
            doc.is_embedded = True
            
            # Add basic topics based on title
            if not doc.topics:
                if 'redox' in doc.title.lower() or 'titration' in doc.title.lower():
                    doc.topics = ["Chemistry", "Redox Reactions", "Titration", "Analytical Chemistry"]
                elif 'aquametry' in doc.title.lower():
                    doc.topics = ["Chemistry", "Water Analysis", "Analytical Chemistry", "Aquametry"]
                elif '200140' in doc.title:
                    doc.topics = ["General", "Document", "Study Material"]
                else:
                    doc.topics = ["General", "Study Material"]
            
            doc.save()
            print(f"✅ Fixed: {doc.title}")
            print(f"   Embedded: {doc.is_embedded}")
            print(f"   Topics: {doc.topics}")
            print(f"   Pages: {doc.pages.count()}")
            print(f"   Chunks: {doc.chunks.count()}")
        else:
            print(f"⚠️  Skipped: {doc.title} (no chunks)")
    
    print("\n🎉 All documents fixed!")

if __name__ == "__main__":
    fix_documents()
