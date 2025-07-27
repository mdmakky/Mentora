#!/usr/bin/env python
"""
Test script for different upload endpoints
"""

import os
import sys
import django
import requests
import time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_backend.settings')
django.setup()

def test_upload_endpoints():
    """Test different upload endpoints with a small PDF."""
    
    # Check if server is running
    try:
        response = requests.get('http://localhost:8000/api/')
        print("✅ Server is running")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start with: python manage.py runserver")
        return
    
    # Find a test PDF file
    test_file = None
    possible_files = [
        'media/documents/200140.pdf',
        'media/documents/Question_1.pdf'
    ]
    
    for file_path in possible_files:
        if os.path.exists(file_path):
            test_file = file_path
            break
    
    if not test_file:
        print("❌ No test PDF file found. Please upload a PDF first.")
        return
    
    print(f"📁 Using test file: {test_file}")
    
    # Test 1: Simple upload (fastest)
    print("\n🚀 Testing Simple Upload (fastest)...")
    with open(test_file, 'rb') as f:
        files = {'file': f}
        data = {'title': 'Test Simple Upload'}
        
        start_time = time.time()
        response = requests.post('http://localhost:8000/api/reader/upload/simple/', 
                               files=files, data=data)
        end_time = time.time()
        
        print(f"⏱️  Time taken: {end_time - start_time:.2f} seconds")
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Document ID: {result['document_id']}")
            print(f"📄 Pages: {result['total_pages']}")
            print(f"🏷️  Status: {result['status']}")
        else:
            print(f"❌ Error: {response.text}")
    
    # Test 2: Fast upload with background processing
    print("\n🚀 Testing Fast Upload with Background Processing...")
    with open(test_file, 'rb') as f:
        files = {'file': f}
        data = {'title': 'Test Fast Upload'}
        
        start_time = time.time()
        response = requests.post('http://localhost:8000/api/reader/upload/fast/', 
                               files=files, data=data)
        end_time = time.time()
        
        print(f"⏱️  Time taken: {end_time - start_time:.2f} seconds")
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            doc_id = result['document_id']
            print(f"✅ Document ID: {doc_id}")
            print(f"🏷️  Initial Status: {result['status']}")
            
            # Check status a few times
            for i in range(3):
                time.sleep(2)
                status_response = requests.get(f'http://localhost:8000/api/reader/documents/{doc_id}/status/')
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"📈 Status update {i+1}: {status_data['status']} - {status_data['message']}")
                    if status_data['status'] in ['completed', 'partial']:
                        break
        else:
            print(f"❌ Error: {response.text}")

if __name__ == "__main__":
    test_upload_endpoints()
