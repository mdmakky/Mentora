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
import uuid
from .prompts import (
    should_search_documents, 
    is_elaboration_request, 
    build_system_prompt,
    get_conversation_context
)


def normalize_uuid(uuid_value):
    """
    Normalize UUID to standard string format with dashes.
    Handles both UUID objects and string representations.
    """
    if isinstance(uuid_value, uuid.UUID):
        return str(uuid_value)
    elif isinstance(uuid_value, str):
        # Remove any existing dashes and recreate with proper format
        clean_uuid = uuid_value.replace('-', '')
        if len(clean_uuid) == 32:
            # Insert dashes at proper positions: 8-4-4-4-12
            return f"{clean_uuid[:8]}-{clean_uuid[8:12]}-{clean_uuid[12:16]}-{clean_uuid[16:20]}-{clean_uuid[20:]}"
    return str(uuid_value)
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
                first_user_message = session.messages.filter(message_type='user').first()
                
                sessions_data.append({
                    'id': session.id,
                    'title': session.title,
                    'document_title': session.document.title if session.document else None,
                    'created_at': session.created_at,
                    'updated_at': session.updated_at,
                    'last_message': last_message.content[:100] + '...' if last_message and len(last_message.content) > 100 else last_message.content if last_message else None,
                    'first_user_message': first_user_message.content[:80] + '...' if first_user_message and len(first_user_message.content) > 80 else first_user_message.content if first_user_message else None
                })
            
            return Response({
                'sessions': sessions_data,
                'count': len(sessions_data)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, session_id=None):
        """Delete a chat session."""
        try:
            if session_id:
                session = get_object_or_404(ChatSession, id=session_id)
                session.delete()
                return Response({'message': 'Session deleted successfully'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Session ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChatMessageView(APIView):
    """Handle chat messages and AI responses."""
    
    def post(self, request, session_id):
        """Send a message and get AI response."""
        try:
            session = get_object_or_404(ChatSession, id=session_id)
            user_message = request.data.get('message') or request.data.get('content')
            page_number = request.data.get('page_number')
            search_documents = request.data.get('search_documents', False)  # New parameter
            
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
            
            # Generate AI response with document search preference
            ai_response = self._generate_ai_response(session, user_message, page_number, search_documents)
            
            # Save AI response
            ai_msg = ChatMessage.objects.create(
                session=session,
                message_type='ai',
                content=ai_response,
                page_reference=user_msg.page_reference
            )
            
            # Update session title if this is the first user message
            user_message_count = session.messages.filter(message_type='user').count()
            print(f"User message count: {user_message_count}, Session title: {session.title}")
            
            if user_message_count == 1 and session.title == 'New Chat Session':
                print("Triggering title update...")
                self._update_session_title(session, user_message)
            else:
                print(f"Not updating title - count: {user_message_count}, title: {session.title}")
            
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
    
    def _generate_ai_response(self, session, user_message, page_number=None, search_documents=False):
        """Generate context-aware AI response."""
        try:
            # Get conversation history for context
            recent_messages = session.messages.order_by('-timestamp')[:10]  # Last 10 messages
            chat_history = []
            
            for msg in reversed(recent_messages):
                chat_history.append({
                    'role': 'user' if msg.message_type == 'user' else 'assistant',
                    'content': msg.content
                })
            
            # Determine if we should search documents based on toggle or keywords
            should_search = search_documents or should_search_documents(user_message, chat_history)
            
            # Initialize document context
            document_context = None
            
            # Search documents if requested and available
            if should_search:
                if session.document:
                    processor = PDFProcessor()
                    document_ids = [normalize_uuid(session.document.id)]
                    
                    # Get relevant document chunks
                    search_results = processor.semantic_query(user_message, document_ids)
                    if search_results.get('semantic_results'):
                        contexts = []
                        for result in search_results['semantic_results'][:5]:  # Top 5 results
                            contexts.append(result['content'])
                        document_context = "\n\n".join(contexts)
                elif search_documents:  # User explicitly requested document search but no document attached
                    # Try to search through all available documents for this user
                    from reader.models import Document
                    user = session.user
                    available_docs = Document.objects.filter(user=user, is_processed=True)
                    
                    if available_docs.exists():
                        processor = PDFProcessor()
                        document_ids = [str(doc.id) for doc in available_docs]
                        
                        # Search through all user's documents
                        search_results = processor.semantic_query(user_message, document_ids)
                        if search_results.get('semantic_results'):
                            contexts = []
                            for result in search_results['semantic_results'][:5]:  # Top 5 results
                                contexts.append(result['content'])
                            document_context = "\n\n".join(contexts)
                    
                    if not document_context:
                        # No documents available or no relevant content found
                        doc_count = available_docs.count()
                        if doc_count == 0:
                            return "I don't have access to any documents. Please upload some documents first to enable document search."
                        else:
                            doc_titles = list(available_docs.values_list('title', flat=True)[:3])  # Show up to 3 document names
                            title_list = ", ".join(doc_titles)
                            if doc_count > 3:
                                title_list += f" (and {doc_count - 3} more)"
                            return f"I searched through your {doc_count} document(s) including '{title_list}' but couldn't find information relevant to your question. Try asking about topics covered in these documents or rephrasing your question."
            
            # Build appropriate system prompt
            system_prompt = self._build_custom_system_prompt(user_message, chat_history, document_context, search_documents)
            
            # Generate response using Google Generative AI
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.7
            )
            
            # Create messages for the LLM
            messages = [
                SystemMessage(content=system_prompt),
            ]
            
            # Add recent conversation context (last 6 messages)
            for msg in chat_history[-6:]:
                if msg['role'] == 'user':
                    messages.append(HumanMessage(content=msg['content']))
                else:
                    messages.append(AIMessage(content=msg['content']))
            
            # Add current user message
            messages.append(HumanMessage(content=user_message))
            
            # Generate response
            response = llm.invoke(messages)
            return response.content
            
        except Exception as e:
            return f"I apologize, but I encountered an error while processing your request. Please try again. Error: {str(e)}"
    
    def _build_custom_system_prompt(self, user_message, chat_history, document_context, search_documents):
        """Build system prompt based on whether document search is enabled."""
        base_prompt = """You are Mentora, an AI study assistant. You are helpful, friendly, and concise.

Key behaviors:
- Be conversational and friendly, like a study buddy
- Keep responses concise unless specifically asked for detailed explanations
- Use simple, clear language appropriate for students
- Maintain conversation context and refer to previous messages when relevant
- Be encouraging and supportive in your responses

Response length guidelines:
- Default: 1-3 sentences for simple questions
- Use "Would you like me to explain more?" to offer additional detail
- Only give detailed explanations when asked for "detailed", "elaborate", "explain in detail", etc.
"""

        if search_documents and document_context:
            base_prompt += """
DOCUMENT SEARCH MODE: The user has enabled document search. Use the provided document context to answer their question accurately. Base your response primarily on the document content while maintaining a helpful, educational tone.

Document context:
""" + document_context
        elif search_documents and not document_context:
            base_prompt += """
DOCUMENT SEARCH MODE: The user requested document search, but no relevant content was found. Inform them politely that no relevant information was found in the attached documents for their query.
"""
        else:
            base_prompt += """
GENERAL KNOWLEDGE MODE: Answer using your built-in knowledge. Do not search or reference documents unless the user specifically mentions them.
"""
        
        return base_prompt
    
    def _update_session_title(self, session, first_user_message):
        """Generate and update session title based on the first user message."""
        try:
            print(f"Updating session title for message: {first_user_message}")
            
            # Use AI to generate a concise title
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.3
            )
            
            prompt = f"""
            Generate a short, descriptive title (maximum 4-5 words) for a chat session based on this first message:
            
            Message: "{first_user_message}"
            
            The title should capture the main topic or subject being discussed. Examples:
            - "Physics Concepts Help"
            - "Math Problem Solving"
            - "History Essay Questions"
            - "Chemistry Lab Analysis"
            
            Only return the title, nothing else.
            """
            
            messages = [HumanMessage(content=prompt)]
            response = llm.invoke(messages)
            
            # Clean up the title
            title = response.content.strip().replace('"', '').replace("'", '')
            
            # Ensure it's not too long
            if len(title) > 50:
                title = title[:47] + "..."
            
            print(f"Generated title: {title}")
            
            # Update session title
            session.title = title
            session.save()
            
            print(f"Session title updated successfully to: {session.title}")
            
        except Exception as e:
            print(f"Error updating session title: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback: Create simple title from first few words
            try:
                words = first_user_message.split()[:3]
                fallback_title = ' '.join(words).title()
                if len(fallback_title) > 30:
                    fallback_title = fallback_title[:27] + "..."
                session.title = fallback_title
                session.save()
                print(f"Used fallback title: {fallback_title}")
            except:
                print("Fallback title generation also failed, keeping default title")


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


class ExplainConceptView(APIView):
    """Handle concept explanation requests from PDF viewer."""
    
    def post(self, request):
        """Explain a concept or answer questions about a document."""
        try:
            concept = request.data.get('concept', '')
            document_id = request.data.get('document_id')
            chat_history = request.data.get('chat_history', [])
            
            if not concept:
                return Response({'error': 'Concept/question is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get document if provided
            document = None
            context = ""
            if document_id:
                try:
                    document = Document.objects.get(id=document_id)
                    # Get some pages for context (first few pages)
                    pages = Page.objects.filter(document=document)[:3]
                    if pages:
                        context = "\n\n".join([f"Page {p.page_number}: {p.content[:500]}..." for p in pages])
                    else:
                        context = f"Document: {document.title}"
                except Document.DoesNotExist:
                    context = "Document not found, but I can still help with general questions."
            
            # Create a more intelligent response based on the question
            explanation = self._generate_explanation(concept, document, context, chat_history)
            
            return Response({
                'explanation': explanation,
                'document_id': document_id,
                'document_title': document.title if document else None
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_explanation(self, concept, document, context, chat_history=None):
        """Generate a contextual explanation using RAG system."""
        concept_lower = concept.lower().strip()
        
        # Prepare chat history context
        history_context = ""
        if chat_history:
            recent_history = chat_history[-6:]  # Last 3 exchanges
            for msg in recent_history:
                role = "User" if msg.get('message_type') == 'user' else "Assistant"
                history_context += f"{role}: {msg.get('content', '')}\n"
        
        # Handle greetings
        if any(greeting in concept_lower for greeting in ['hi', 'hello', 'hey', 'greetings']):
            if document:
                return f"""Hello! I'm your AI study assistant. I'm here to help you understand the document "{document.title}".

You can ask me questions like:
• "What is the main topic of this document?"
• "Explain [specific concept] from the document"
• "Summarize page [number]"
• "What are the key points?"
• "How does [concept A] relate to [concept B]?"

What would you like to know about this document?"""
            else:
                return """Hello! I'm your AI study assistant. I'm here to help you understand academic content and answer your questions.

Feel free to ask me about:
• Specific concepts or terms
• How different ideas relate to each other
• Explanations of complex topics
• Study strategies and tips

What would you like to learn about today?"""
        
        # Use RAG system for all non-greeting queries
        try:
            from reader.utils import PDFProcessor
            
            # Initialize PDF processor with RAG capabilities
            processor = PDFProcessor()
            
            # Determine document IDs to search
            document_ids = []
            if document:
                document_ids = [normalize_uuid(document.id)]
            else:
                # Search all documents if no specific document
                from reader.models import Document
                all_docs = Document.objects.filter(is_processed=True)
                document_ids = [normalize_uuid(doc.id) for doc in all_docs]
            
            print(f"DEBUG: Searching with document_ids: {document_ids}")
            
            # Prepare chat history for RAG
            rag_chat_history = []
            if history_context:
                for msg in chat_history[-6:]:  # Last 6 messages
                    rag_chat_history.append({
                        'message_type': msg.get('message_type', 'user'),
                        'content': msg.get('content', ''),
                        'timestamp': msg.get('timestamp', '')
                    })
            
            # Use RAG system with chat history support
            response = processor.rag_chat_response(concept, document_ids, rag_chat_history)
            
            return response
                
        except Exception as e:
            print(f"RAG error in explanation: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback to original method if RAG fails
            return self._generate_fallback_explanation(concept, document)
    
    def _generate_fallback_explanation(self, concept, document):
        """Fallback explanation method when RAG is not available."""
        concept_lower = concept.lower().strip()
        
        # Handle document-specific questions
        if document:
            document_title = document.title.lower()
            
            # Questions about the document itself
            if any(phrase in concept_lower for phrase in ['what is this document', 'what is this about', 'main topic', 'summary of document']):
                return f"""This document is titled "{document.title}" and appears to be an academic or educational material.

Based on the document structure, here are some ways I can help you:

**Understanding the Content:**
• I can explain specific concepts or terms that appear in the document
• Break down complex ideas into simpler parts
• Help you identify key themes and topics

**Study Strategies:**
• Summarize important sections
• Help you create connections between different concepts
• Suggest questions to test your understanding

**Specific Questions:**
Feel free to ask about any particular section, concept, or idea from "{document.title}" that you'd like me to explain in more detail.

What specific aspect would you like to explore?"""
            
            # Handle requests for definitions and key terms
            if any(phrase in concept_lower for phrase in ['definition', 'key terms', 'important terms', 'vocabulary']):
                return f"""I'd be happy to help you identify and understand key terms from "{document.title}".

**How to work with definitions and key terms:**

1. **Identify Core Concepts**: Look for terms that appear frequently or are emphasized (bold, italics, headings)

2. **Context Clues**: Pay attention to how terms are used in different sentences to understand their meaning

3. **Relationships**: Notice how different terms connect to each other

4. **Examples**: Look for concrete examples that illustrate abstract concepts

**For this document specifically:**
If you point out specific terms or concepts from "{document.title}" that you'd like defined or explained, I can help break them down and show how they relate to the overall content.

Which particular terms or concepts would you like me to explain?"""
            
            # Handle relationship questions
            if any(phrase in concept_lower for phrase in ['relationship', 'connect', 'relate', 'connection', 'between']):
                return f"""Understanding relationships between ideas is crucial for deeper learning! Here's how to identify connections in "{document.title}":

**Types of Relationships to Look For:**

1. **Cause and Effect**: How one concept leads to or influences another
2. **Compare and Contrast**: Similarities and differences between ideas
3. **Hierarchical**: How concepts build upon each other (basic → advanced)
4. **Functional**: How different parts work together toward a common goal

**Strategies for Finding Connections:**
• Look for transition words (therefore, however, similarly, in contrast)
• Notice how authors introduce new concepts in relation to previous ones
• Pay attention to examples that bridge different sections
• Create concept maps or diagrams to visualize relationships

**For Your Document:**
If you can specify which particular concepts or sections from "{document.title}" you'd like me to help connect, I can provide more targeted guidance on their relationships.

What specific ideas would you like me to help you connect?"""
        
        # Handle general academic concepts
        if any(phrase in concept_lower for phrase in ['study', 'learn', 'understand', 'academic']):
            return f"""Here are some effective strategies for studying and understanding academic content:

**Active Reading Techniques:**
• Preview the material before reading in detail
• Take notes and summarize key points in your own words
• Ask questions as you read
• Make connections to what you already know

**Comprehension Strategies:**
• Break complex topics into smaller, manageable parts
• Use examples and analogies to understand abstract concepts
• Create visual aids like diagrams or concept maps
• Teach the concept to someone else (or explain it out loud)

**Critical Thinking:**
• Analyze the evidence presented
• Consider different perspectives
• Evaluate the strengths and weaknesses of arguments
• Apply concepts to new situations

{f'For your document "{document.title}", ' if document else ''}try focusing on one section at a time and using these techniques to build your understanding progressively.

Is there a specific study challenge you're facing that I can help address?"""
        
        # Default response for specific questions
        if document:
            return f"""I understand you're asking about: "{concept}"

While I'd love to provide more specific insights about this topic in relation to "{document.title}", I can offer some general guidance:

**Approach for Understanding "{concept}":**

1. **Define the Term**: Start by identifying what "{concept}" means in the context of your document
2. **Find Examples**: Look for specific instances or examples in the text
3. **Context Analysis**: Consider how this concept fits within the broader themes of the document
4. **Application**: Think about how this concept might be used or applied

**Next Steps:**
• Can you point me to a specific section or page where this concept appears?
• Are there particular aspects of "{concept}" that are confusing?
• Would you like me to help you break down this concept into smaller parts?

Feel free to ask more specific questions about "{concept}" or share a particular passage you'd like me to help explain!"""
        else:
            return f"""You're asking about: "{concept}"

Here's a general approach to understanding this topic:

**Breaking Down "{concept}":**
1. **Core Definition**: What does this term or idea fundamentally mean?
2. **Key Components**: What are the main parts or aspects of this concept?
3. **Examples**: What are some concrete instances where this applies?
4. **Relationships**: How does this connect to other related ideas?

**Study Strategies:**
• Look for authoritative sources that define and explain this concept
• Find multiple examples to see how it's applied in different contexts
• Try to explain it in your own words
• Consider how it relates to concepts you already understand

Would you like to explore any specific aspect of "{concept}" in more detail? Or do you have a particular context where you've encountered this term?"""
