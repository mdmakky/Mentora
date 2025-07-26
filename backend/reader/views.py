from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Document, Page, Topic, QuestionBank, Flashcard
from .utils import PDFProcessor, save_uploaded_file, cleanup_file
import os
import uuid
from django.conf import settings


@method_decorator(csrf_exempt, name='dispatch')
class DocumentUploadView(APIView):
    """Handle PDF document uploads and processing."""
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
            
            # Save file temporarily for processing
            temp_path = f"/tmp/{uuid.uuid4()}.pdf"
            save_uploaded_file(file_obj, temp_path)
            
            # Process PDF
            processor = PDFProcessor()
            pdf_data = processor.extract_pdf_text(temp_path)
            
            # Update document
            document.total_pages = pdf_data['total_pages']
            document.topics = processor.detect_topics(pdf_data['full_text'])
            document.is_processed = True
            document.save()
            
            # Create page records
            for page_data in pdf_data['pages']:
                Page.objects.create(
                    document=document,
                    page_number=page_data['page_number'],
                    content=page_data['content'],
                    summary=processor.summarize_content(page_data['content'], "page")
                )
            
            # Create topic records
            for topic_name in document.topics:
                Topic.objects.create(
                    document=document,
                    name=topic_name
                )
            
            # Cleanup
            cleanup_file(temp_path)
            
            return Response({
                'document_id': document.id,
                'title': document.title,
                'total_pages': document.total_pages,
                'topics': document.topics,
                'message': 'Document uploaded and processed successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
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
                    'is_processed': doc.is_processed
                })
            
            return Response({
                'documents': documents_data,
                'count': len(documents_data)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
