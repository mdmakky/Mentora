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


@method_decorator(csrf_exempt, name='dispatch')
class DocumentUploadView(APIView):
    """Handle PDF document uploads and processing with embeddings."""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            file_obj = request.FILES.get('file')
            title = request.data.get('title', file_obj.name if file_obj else 'Untitled')
            
            if not file_obj:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create document record
            document = Document.objects.create(
                user=request.user if request.user.is_authenticated else User.objects.get(id=1),  # Default user for now
                title=title,
                file=file_obj
            )
            
            # Process PDF with AI and create embeddings
            try:
                processor = PDFProcessor()
                
                # Extract text from PDF
                pdf_data = processor.extract_pdf_text(document.file.path)
                
                # Update document with basic info
                document.total_pages = pdf_data['total_pages']
                document.is_processed = True
                document.save()
                
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
                
                # Create embeddings for semantic search
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
                
                # Mark as embedded
                document.is_embedded = True
                
                # Detect topics using AI
                topics = processor.detect_topics(pdf_data['full_text'])
                document.topics = topics
                document.save()
                
            except Exception as pdf_error:
                print(f"PDF processing error: {str(pdf_error)}")
                # Continue without processing
                document.total_pages = 0
                document.topics = []
                document.is_processed = False
                document.is_embedded = False
                document.save()
            
            return Response({
                'document_id': document.id,
                'title': document.title,
                'total_pages': document.total_pages,
                'topics': document.topics,
                'is_embedded': document.is_embedded,
                'message': 'Document uploaded and processed successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            print(f"Upload error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentSummaryView(APIView):
    """Get summary of a document or specific pages."""
    
    def get(self, request, document_id):
        try:
            document = get_object_or_404(Document, id=document_id)
            page_number = request.query_params.get('page')
            
            if page_number:
                # Get specific page summary
                page = get_object_or_404(Page, document=document, page_number=int(page_number))
                return Response({
                    'page_number': page.page_number,
                    'summary': page.summary,
                    'content': page.content[:500] + '...' if len(page.content) > 500 else page.content
                })
            else:
                # Get document overview
                processor = PDFProcessor()
                full_text = ' '.join([page.content for page in document.pages.all()[:5]])  # First 5 pages for overview
                overall_summary = processor.summarize_content(full_text, "general")
                
                return Response({
                    'document_id': document.id,
                    'title': document.title,
                    'total_pages': document.total_pages,
                    'topics': document.topics,
                    'summary': overall_summary,
                    'pages': [
                        {
                            'page_number': page.page_number,
                            'summary': page.summary
                        } for page in document.pages.all()
                    ]
                })
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuestionBankUploadView(APIView):
    """Handle question bank uploads and analysis."""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            file_obj = request.FILES.get('file')
            title = request.data.get('title', file_obj.name if file_obj else 'Question Bank')
            year = request.data.get('year')
            subject = request.data.get('subject', '')
            
            if not file_obj:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create question bank record
            question_bank = QuestionBank.objects.create(
                user=request.user if request.user.is_authenticated else User.objects.get(id=1),
                title=title,
                file=file_obj,
                year=int(year) if year else None,
                subject=subject
            )
            
            # Save file temporarily for processing
            temp_path = f"/tmp/{uuid.uuid4()}.pdf"
            save_uploaded_file(file_obj, temp_path)
            
            # Process questions
            processor = PDFProcessor()
            questions_data = processor.extract_pdf_text(temp_path)
            analysis = processor.analyze_questions(questions_data['full_text'])
            
            # Update question bank
            question_bank.topics = analysis.get('topics', [])
            question_bank.question_types = analysis.get('question_types', [])
            question_bank.is_analyzed = True
            question_bank.save()
            
            # Cleanup
            cleanup_file(temp_path)
            
            return Response({
                'question_bank_id': question_bank.id,
                'title': question_bank.title,
                'topics': question_bank.topics,
                'question_types': question_bank.question_types,
                'analysis': analysis,
                'message': 'Question bank uploaded and analyzed successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FlashcardGeneratorView(APIView):
    """Generate flashcards from document content."""
    
    def post(self, request):
        try:
            document_id = request.data.get('document_id')
            topic_name = request.data.get('topic')
            
            document = get_object_or_404(Document, id=document_id)
            
            if topic_name:
                # Generate flashcards for specific topic
                topic = get_object_or_404(Topic, document=document, name=topic_name)
                pages = topic.pages.all()
                content = ' '.join([page.content for page in pages])
            else:
                # Generate flashcards for entire document
                content = ' '.join([page.content for page in document.pages.all()[:10]])  # Limit to first 10 pages
            
            processor = PDFProcessor()
            flashcards_data = processor.generate_flashcards(content)
            
            # Save flashcards
            flashcards = []
            for card_data in flashcards_data:
                flashcard = Flashcard.objects.create(
                    user=request.user if request.user.is_authenticated else User.objects.get(id=1),
                    document=document,
                    topic=topic if topic_name else None,
                    question=card_data.get('question', ''),
                    answer=card_data.get('answer', '')
                )
                flashcards.append({
                    'id': flashcard.id,
                    'question': flashcard.question,
                    'answer': flashcard.answer
                })
            
            return Response({
                'flashcards': flashcards,
                'count': len(flashcards),
                'message': f'Generated {len(flashcards)} flashcards'
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConceptExplanationView(APIView):
    """Explain specific concepts or terms."""
    
    def post(self, request):
        try:
            concept = request.data.get('concept')
            document_id = request.data.get('document_id')
            page_number = request.data.get('page_number')
            
            if not concept:
                return Response({'error': 'Concept is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            context = ""
            if document_id:
                document = get_object_or_404(Document, id=document_id)
                if page_number:
                    page = get_object_or_404(Page, document=document, page_number=int(page_number))
                    context = page.content
                else:
                    # Use first few pages as context
                    pages = document.pages.all()[:3]
                    context = ' '.join([page.content for page in pages])
            
            processor = PDFProcessor()
            explanation = processor.explain_concept(concept, context)
            
            return Response({
                'concept': concept,
                'explanation': explanation,
                'context_used': bool(context)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentListView(APIView):
    """List all documents for a user."""
    
    def get(self, request):
        try:
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            documents = Document.objects.filter(user=user)
            
            documents_data = []
            for doc in documents:
                documents_data.append({
                    'id': doc.id,
                    'title': doc.title,
                    'upload_date': doc.upload_date,
                    'total_pages': doc.total_pages,
                    'topics': doc.topics,
                    'is_processed': doc.is_processed,
                    'file': f'/api/reader/documents/{doc.id}/file/'
                })
            
            return Response({
                'documents': documents_data,
                'count': len(documents_data)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class DocumentDeleteView(APIView):
    """Delete a document and its associated files."""
    
    def delete(self, request, document_id):
        try:
            document = get_object_or_404(Document, id=document_id)
            
            # Delete the physical file
            if document.file:
                file_path = document.file.path
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            # Delete the document record (this will cascade to pages, topics, etc.)
            document.delete()
            
            return Response({
                'message': 'Document deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class SemanticSearchView(APIView):
    """Perform semantic search across documents."""
    
    def post(self, request):
        try:
            query = request.data.get('query', '')
            document_ids = request.data.get('document_ids', [])
            top_k = request.data.get('top_k', 5)
            
            if not query:
                return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            processor = PDFProcessor()
            
            # Convert document_ids to strings if they're UUIDs
            str_document_ids = [str(doc_id) for doc_id in document_ids] if document_ids else None
            
            # Perform semantic search
            search_results = processor.semantic_query(query, str_document_ids)
            
            # Format results with document information
            formatted_results = []
            for result in search_results.get('semantic_results', []):
                metadata = result.get('metadata', {})
                doc_id = metadata.get('document_id')
                
                try:
                    document = Document.objects.get(id=doc_id)
                    formatted_result = {
                        'content': result['content'],
                        'similarity_score': result['similarity_score'],
                        'document_id': doc_id,
                        'document_title': document.title,
                        'page_number': metadata.get('page_number'),
                        'chunk_index': metadata.get('chunk_index'),
                    }
                    formatted_results.append(formatted_result)
                except Document.DoesNotExist:
                    continue
            
            return Response({
                'query': query,
                'results': formatted_results,
                'total_results': len(formatted_results)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class RAGChatView(APIView):
    """Chat with documents using RAG (Retrieval Augmented Generation)."""
    
    def post(self, request):
        try:
            query = request.data.get('query', '')
            document_ids = request.data.get('document_ids', [])
            chat_history = request.data.get('chat_history', [])
            
            if not query:
                return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            processor = PDFProcessor()
            
            # Convert document_ids to strings if they're UUIDs
            str_document_ids = [str(doc_id) for doc_id in document_ids] if document_ids else None
            
            # Generate RAG response
            response = processor.rag_chat_response(query, str_document_ids, chat_history)
            
            # Also get the search results for transparency
            search_results = processor.semantic_query(query, str_document_ids)
            
            return Response({
                'query': query,
                'response': response,
                'source_chunks': len(search_results.get('semantic_results', [])),
                'timestamp': uuid.uuid4().hex  # Simple timestamp for conversation tracking
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class DocumentStatsView(APIView):
    """Get statistics about document processing and embeddings."""
    
    def get(self, request):
        try:
            total_documents = Document.objects.count()
            processed_documents = Document.objects.filter(is_processed=True).count()
            embedded_documents = Document.objects.filter(is_embedded=True).count()
            total_chunks = DocumentChunk.objects.count()
            
            # Get vector store stats
            processor = PDFProcessor()
            vector_stats = processor.vector_service.get_collection_stats()
            
            return Response({
                'total_documents': total_documents,
                'processed_documents': processed_documents,
                'embedded_documents': embedded_documents,
                'total_chunks': total_chunks,
                'vector_store_stats': vector_stats
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class DocumentFileView(APIView):
    """Serve PDF files for viewing."""
    
    def get(self, request, document_id):
        try:
            from django.http import FileResponse, Http404
            
            document = get_object_or_404(Document, id=document_id)
            
            if not document.file:
                raise Http404("Document file not found")
            
            file_path = document.file.path
            if not os.path.exists(file_path):
                raise Http404("Document file not found on disk")
            
            response = FileResponse(
                open(file_path, 'rb'),
                content_type='application/pdf',
                filename=f"{document.title}.pdf"
            )
            response['Content-Disposition'] = f'inline; filename="{document.title}.pdf"'
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Range, Content-Range, Accept-Ranges'
            response['Accept-Ranges'] = 'bytes'
            return response
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
