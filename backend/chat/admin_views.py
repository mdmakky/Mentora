"""
Simple API endpoints for configuring AI behavior.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .config import get_active_config, update_config, CUSTOM_PROMPTS
from .prompts import BASE_SYSTEM_PROMPT


class AIConfigView(APIView):
    """View and update AI configuration settings."""
    
    def get(self, request):
        """Get current AI configuration."""
        try:
            config = get_active_config()
            return Response({
                'current_config': config,
                'available_prompts': list(CUSTOM_PROMPTS.keys()),
                'base_system_prompt': BASE_SYSTEM_PROMPT
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update AI configuration settings."""
        try:
            updates = request.data.get('config', {})
            updated_keys = []
            failed_keys = []
            
            for key, value in updates.items():
                if update_config(key, value):
                    updated_keys.append(key)
                else:
                    failed_keys.append(key)
            
            return Response({
                'message': 'Configuration updated',
                'updated': updated_keys,
                'failed': failed_keys,
                'current_config': get_active_config()
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIPromptTestView(APIView):
    """Test different AI prompts and behaviors."""
    
    def post(self, request):
        """Test a prompt with sample input."""
        try:
            test_query = request.data.get('query', 'What is linear regression?')
            prompt_type = request.data.get('prompt_type', 'general_tutor')
            
            # Import here to avoid circular imports
            from .prompts import build_system_prompt, should_search_documents, is_elaboration_request
            
            # Simulate chat history if provided
            chat_history = request.data.get('chat_history', [])
            
            # Test the prompt building
            system_prompt = build_system_prompt(test_query, chat_history)
            
            # Analyze the query
            analysis = {
                'should_search_documents': should_search_documents(test_query, chat_history),
                'is_elaboration_request': is_elaboration_request(test_query),
                'system_prompt': system_prompt,
                'query': test_query,
                'prompt_type': prompt_type
            }
            
            return Response(analysis)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentSummaryView(APIView):
    """Get summary of available documents for search."""
    
    def get(self, request):
        """Get list of available documents for the user."""
        try:
            from reader.models import Document
            from django.contrib.auth.models import User
            
            # Get user (using default user for now)
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            
            # Get processed documents
            documents = Document.objects.filter(user=user, is_processed=True)
            
            doc_list = []
            for doc in documents:
                doc_list.append({
                    'id': str(doc.id),
                    'title': doc.title,
                    'total_pages': doc.total_pages,
                    'topics': doc.topics[:5] if doc.topics else [],  # First 5 topics
                    'upload_date': doc.upload_date
                })
            
            return Response({
                'total_documents': documents.count(),
                'documents': doc_list,
                'message': f'You have {documents.count()} documents available for search'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
