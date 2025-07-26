from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from .models import ChatSession, ChatMessage
from reader.models import Document, Page
from reader.utils import PDFProcessor
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from django.conf import settings


class ChatSessionView(APIView):
    """Handle chat session creation and management."""
    
    def post(self, request):
        """Create a new chat session."""
        try:
            document_id = request.data.get('document_id')
            title = request.data.get('title', 'New Chat')
            
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            document = None
            
            if document_id:
                document = get_object_or_404(Document, id=document_id)
                if not title or title == 'New Chat':
                    title = f"Chat about {document.title}"
            
            session = ChatSession.objects.create(
                user=user,
                document=document,
                title=title
            )
            
            # Add welcome message
            welcome_msg = "Hi! I'm your AI study companion. "
            if document:
                welcome_msg += f"I can help you with questions about '{document.title}'. "
            welcome_msg += "What would you like to know?"
            
            ChatMessage.objects.create(
                session=session,
                message_type='ai',
                content=welcome_msg
            )
            
            return Response({
                'session_id': session.id,
                'title': session.title,
                'document_id': document.id if document else None,
                'message': 'Chat session created successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """Get all chat sessions for user."""
        try:
            user = request.user if request.user.is_authenticated else User.objects.get(id=1)
            sessions = ChatSession.objects.filter(user=user)
            
            sessions_data = []
            for session in sessions:
                last_message = session.messages.last()
                sessions_data.append({
                    'id': session.id,
                    'title': session.title,
                    'document_title': session.document.title if session.document else None,
                    'created_at': session.created_at,
                    'updated_at': session.updated_at,
                    'last_message': last_message.content[:100] + '...' if last_message and len(last_message.content) > 100 else last_message.content if last_message else None
                })
            
            return Response({
                'sessions': sessions_data,
                'count': len(sessions_data)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChatMessageView(APIView):
    """Handle chat messages and AI responses."""
    
    def post(self, request, session_id):
        """Send a message and get AI response."""
        try:
            session = get_object_or_404(ChatSession, id=session_id)
            user_message = request.data.get('message')
            page_number = request.data.get('page_number')
            
            if not user_message:
                return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Save user message
            user_msg = ChatMessage.objects.create(
                session=session,
                message_type='user',
                content=user_message,
                page_reference=None
            )
            
            # Add page reference if provided
            if page_number and session.document:
                try:
                    page = Page.objects.get(document=session.document, page_number=int(page_number))
                    user_msg.page_reference = page
                    user_msg.save()
                except Page.DoesNotExist:
                    pass
            
            # Generate AI response
            ai_response = self._generate_ai_response(session, user_message, page_number)
            
            # Save AI response
            ai_msg = ChatMessage.objects.create(
                session=session,
                message_type='ai',
                content=ai_response,
                page_reference=user_msg.page_reference
            )
            
            # Update session timestamp
            session.save()
            
            return Response({
                'user_message': {
                    'id': user_msg.id,
                    'content': user_msg.content,
                    'timestamp': user_msg.timestamp,
                    'page_reference': user_msg.page_reference.page_number if user_msg.page_reference else None
                },
                'ai_response': {
                    'id': ai_msg.id,
                    'content': ai_msg.content,
                    'timestamp': ai_msg.timestamp
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, session_id):
        """Get all messages in a chat session."""
        try:
            session = get_object_or_404(ChatSession, id=session_id)
            messages = session.messages.all()
            
            messages_data = []
            for msg in messages:
                messages_data.append({
                    'id': msg.id,
                    'type': msg.message_type,
                    'content': msg.content,
                    'timestamp': msg.timestamp,
                    'page_reference': msg.page_reference.page_number if msg.page_reference else None
                })
            
            return Response({
                'session_id': session.id,
                'title': session.title,
                'messages': messages_data
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_ai_response(self, session, user_message, page_number=None):
        """Generate AI response using LangChain."""
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.3
            )
            
            # Build context
            context = ""
            if session.document:
                if page_number:
                    # Use specific page context
                    try:
                        page = Page.objects.get(document=session.document, page_number=int(page_number))
                        context = f"Current page content: {page.content}"
                    except Page.DoesNotExist:
                        context = "Page not found."
                else:
                    # Use document summary as context
                    context = f"Document: {session.document.title}\\nTopics: {', '.join(session.document.topics)}"
            
            # Get conversation history
            recent_messages = session.messages.order_by('-timestamp')[:6]  # Last 6 messages
            conversation_history = []
            
            for msg in reversed(recent_messages):
                if msg.message_type == 'user':
                    conversation_history.append(HumanMessage(content=msg.content))
                elif msg.message_type == 'ai':
                    conversation_history.append(AIMessage(content=msg.content))
            
            # Build system prompt
            system_prompt = """You are an intelligent study companion and tutor. Your role is to:
            1. Help students understand study materials
            2. Answer questions about content clearly and concisely
            3. Provide explanations suitable for exam preparation
            4. Break down complex topics into simpler concepts
            5. Suggest study strategies when appropriate
            
            Be helpful, encouraging, and patient. If you don't know something, say so honestly."""
            
            if context:
                system_prompt += f"\\n\\nCurrent context: {context}"
            
            # Prepare messages
            messages = [SystemMessage(content=system_prompt)]
            messages.extend(conversation_history)
            messages.append(HumanMessage(content=user_message))
            
            # Generate response
            response = llm.invoke(messages)
            return response.content
            
        except Exception as e:
            return f"I apologize, but I encountered an error while processing your request. Please try again. Error: {str(e)}"


class StudyPlanView(APIView):
    """Generate study plans based on documents and time available."""
    
    def post(self, request):
        """Generate a personalized study plan."""
        try:
            document_id = request.data.get('document_id')
            days_available = request.data.get('days_available', 7)
            hours_per_day = request.data.get('hours_per_day', 2)
            focus_areas = request.data.get('focus_areas', [])
            
            if not document_id:
                return Response({'error': 'Document ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            document = get_object_or_404(Document, id=document_id)
            
            # Use AI to generate study plan
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.2
            )
            
            prompt = f"""
            Create a personalized study plan for the following material:
            
            Document: {document.title}
            Total Pages: {document.total_pages}
            Topics: {', '.join(document.topics)}
            
            Study constraints:
            - Days available: {days_available}
            - Hours per day: {hours_per_day}
            - Focus areas: {', '.join(focus_areas) if focus_areas else 'All topics'}
            
            Please create a day-by-day study schedule that:
            1. Covers all important topics
            2. Includes time for review
            3. Prioritizes focus areas if specified
            4. Includes breaks and varied study methods
            
            Format as a structured daily plan.
            """
            
            messages = [
                SystemMessage(content="You are an expert study planner who creates effective, personalized study schedules."),
                HumanMessage(content=prompt)
            ]
            
            response = llm.invoke(messages)
            study_plan = response.content
            
            return Response({
                'document_title': document.title,
                'study_plan': study_plan,
                'days_available': days_available,
                'hours_per_day': hours_per_day,
                'focus_areas': focus_areas
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
