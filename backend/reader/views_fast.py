from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Document, Page, Topic, QuestionBank, Flashcard, DocumentChunk
from .utils import PDFProcessor, save_uploaded_file, cleanup_file
import os
import uuid
from django.conf import settings
import json
import threading
import time


@method_decorator(csrf_exempt, name='dispatch')
class DocumentUploadViewFast(APIView):
    """Handle PDF document uploads with fast response and background processing."""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            file_obj = request.FILES.get('file')
            title = request.data.get('title', file_obj.name if file_obj else 'Untitled')
            
            if not file_obj:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create document record immediately
            document = Document.objects.create(
                user=request.user if request.user.is_authenticated else User.objects.get(id=1),
                title=title,
                file=file_obj,
                is_processed=False,
                is_embedded=False
            )
            
            # Start background processing
            processing_thread = threading.Thread(
                target=self._process_document_background,
                args=(document.id,)
            )
            processing_thread.daemon = True
            processing_thread.start()
            
            # Return immediately with document info
            return Response({
                'document_id': document.id,
                'title': document.title,
                'status': 'processing',
                'message': 'Document uploaded successfully. Processing in background...',
                'check_status_url': f'/api/reader/documents/{document.id}/status/'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            print(f"Upload error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _process_document_background(self, document_id):
        """Process document in background thread."""
        try:
            document = Document.objects.get(id=document_id)
            print(f"Starting background processing for document: {document.title}")
            
            processor = PDFProcessor()
            
            # Step 1: Basic PDF info (fast)
            try:
                import PyPDF2
                with open(document.file.path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    document.total_pages = len(pdf_reader.pages)
                    document.save()
                print(f"PDF basic info extracted: {document.total_pages} pages")
            except Exception as e:
                print(f"Error reading PDF basic info: {e}")
                document.total_pages = 0
                document.save()
                return
            
            # Step 2: Text extraction (medium speed)
            try:
                pdf_data = processor.extract_pdf_text(document.file.path)
                print(f"Text extraction completed")
                
                # Create page records
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
                
                document.is_processed = True
                document.save()
                print(f"Page records created")
                
            except Exception as e:
                print(f"Error in text extraction: {e}")
                document.is_processed = False
                document.save()
                return
            
            # Step 3: Embeddings (slow - can be skipped for quick testing)
            try:
                if len(pdf_data['full_text']) < 50000:  # Only for smaller documents
                    chunks_data = processor.process_document_with_embeddings(
                        str(document.id), 
                        pages_data
                    )
                    
                    # Save chunks to database
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
                    
                    document.is_embedded = True
                    print(f"Embeddings created and stored")
                else:
                    print(f"Document too large for embeddings, skipping...")
                
            except Exception as e:
                print(f"Error in embeddings: {e}")
                # Continue without embeddings
            
            # Step 4: Topic detection (requires API call)
            try:
                if hasattr(processor, 'detect_topics'):
                    topics = processor.detect_topics(pdf_data['full_text'][:3000])  # Limit text for speed
                    document.topics = topics
                    print(f"Topics detected: {topics}")
                else:
                    document.topics = ["General"]
                    
            except Exception as e:
                print(f"Error in topic detection: {e}")
                document.topics = ["General"]
            
            # Final save
            document.save()
            print(f"Document processing completed: {document.title}")
            
        except Exception as e:
            print(f"Background processing error: {e}")
            try:
                document = Document.objects.get(id=document_id)
                document.is_processed = False
                document.is_embedded = False
                document.save()
            except:
                pass


@method_decorator(csrf_exempt, name='dispatch')
class DocumentStatusView(APIView):
    """Check document processing status."""
    
    def get(self, request, document_id):
        try:
            document = get_object_or_404(Document, id=document_id)
            
            status_info = {
                'document_id': document.id,
                'title': document.title,
                'total_pages': document.total_pages,
                'is_processed': document.is_processed,
                'is_embedded': document.is_embedded,
                'topics': document.topics,
                'upload_date': document.upload_date,
            }
            
            # Determine overall status
            if document.is_embedded:
                status_info['status'] = 'completed'
                status_info['message'] = 'Document fully processed with embeddings'
            elif document.is_processed:
                status_info['status'] = 'partial'
                status_info['message'] = 'Text extracted, embeddings in progress'
            else:
                status_info['status'] = 'processing'
                status_info['message'] = 'Processing document...'
            
            return Response(status_info, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class DocumentSimpleUploadView(APIView):
    """Simple upload without any AI processing - for testing."""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            file_obj = request.FILES.get('file')
            title = request.data.get('title', file_obj.name if file_obj else 'Untitled')
            
            if not file_obj:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create document record
            document = Document.objects.create(
                user=request.user if request.user.is_authenticated else User.objects.get(id=1),
                title=title,
                file=file_obj
            )
            
            # Basic PDF info only
            try:
                import PyPDF2
                with open(document.file.path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    document.total_pages = len(pdf_reader.pages)
                    document.is_processed = True
                    document.topics = ["General"]
                    document.save()
                    
            except Exception as pdf_error:
                print(f"PDF processing error: {str(pdf_error)}")
                document.total_pages = 0
                document.topics = []
                document.is_processed = False
                document.save()
            
            return Response({
                'document_id': document.id,
                'title': document.title,
                'total_pages': document.total_pages,
                'topics': document.topics,
                'status': 'completed',
                'message': 'Document uploaded successfully (basic processing)'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            print(f"Upload error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
