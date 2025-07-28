import PyPDF2
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from django.conf import settings
import json
import re
from typing import List, Dict, Any
from .vector_service import VectorStoreService, RAGService


class PDFProcessor:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",  # Updated model name
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.2
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,
            chunk_overlap=200
        )
        self.vector_service = VectorStoreService()
        self.rag_service = RAGService(self.vector_service)

    def extract_pdf_text(self, pdf_file_path: str) -> Dict[str, Any]:
        """Extract text from PDF with page-wise content."""
        pages = []
        full_text = ""
        
        with open(pdf_file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                pages.append({
                    'page_number': page_num + 1,
                    'content': page_text
                })
                full_text += f"\\n\\n--- Page {page_num + 1} ---\\n\\n{page_text}"
        
        return {
            'pages': pages,
            'full_text': full_text,
            'total_pages': len(pages)
        }

    def process_document_with_embeddings(self, document_id: str, pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process document and create embeddings for semantic search.
        This is the core function that implements the PDF → Chunks → Embeddings flow from your diagram.
        """
        try:
            # Create embeddings using vector service
            chunks_data = self.vector_service.create_embeddings(document_id, pages_data)
            return chunks_data
        except Exception as e:
            print(f"Error processing document embeddings: {str(e)}")
            return []

    def semantic_query(self, query: str, document_ids: List[str] = None) -> Dict[str, Any]:
        """
        Perform semantic search on documents - implements the User Query → Embedding → Search flow.
        """
        try:
            return self.rag_service.enhanced_search(query, document_ids)
        except Exception as e:
            print(f"Semantic query error: {e}")
            return {'semantic_results': [], 'query': query, 'total_results': 0}
    def rag_chat_response(self, query: str, document_ids: List[str] = None, chat_history: List[Dict] = None) -> str:
        """
        Generate AI response using RAG - implements the System Query (Pages + User Query) → LLM → Final Output flow.
        """
        try:
            # Try to get relevant context from documents
            context = ""
            try:
                context = self.rag_service.get_context_for_query(query, document_ids)
            except Exception as context_error:
                print(f"Context retrieval failed: {context_error}")
                # Continue without context - fallback to general AI response
            
            # Prepare chat history context
            history_context = ""
            if chat_history:
                recent_history = chat_history[-6:]  # Last 3 exchanges
                for msg in recent_history:
                    role = "User" if msg.get('message_type') == 'user' else "Assistant"
                    history_context += f"{role}: {msg.get('content', '')}\n"
            
            # Create enhanced prompt with context (if available)
            if context.strip():
                prompt = f"""
                You are an AI tutor helping students understand their study materials. Use the provided context to answer the question comprehensively.
                
                Context from Documents:
                {context}
                
                Chat History:
                {history_context}
                
                Student Question: {query}
                
                Instructions:
                - Use information from the provided context when relevant
                - If the context doesn't contain sufficient information, say so clearly
                - Provide educational explanations suitable for students
                - Reference specific pages when using information from the context
                - Be encouraging and supportive in your tone
                """
            else:
                # Fallback prompt when no document context is available
                prompt = f"""
                You are an AI tutor helping students with their questions. Answer the following question comprehensively and educationally.
                
                Chat History:
                {history_context}
                
                Student Question: {query}
                
                Instructions:
                - Provide clear, educational explanations suitable for students
                - Be encouraging and supportive in your tone
                - If this seems like a specific academic topic, provide detailed information
                - Break down complex concepts into understandable parts
                """
            
            messages = [
                SystemMessage(content="You are a helpful AI tutor specializing in explaining academic content clearly."),
                HumanMessage(content=prompt)
            ]
            
            response = self.llm.invoke(messages)
            return response.content
            
        except Exception as e:
            # Final fallback - simple direct response
            try:
                simple_prompt = f"As an AI tutor, please answer this student's question: {query}"
                messages = [
                    SystemMessage(content="You are a helpful AI tutor."),
                    HumanMessage(content=simple_prompt)
                ]
                response = self.llm.invoke(messages)
                return response.content
            except:
                return f"I apologize, but I'm currently experiencing technical difficulties. Please try asking your question again."

    def extract_pdf_text(self, pdf_file_path: str) -> Dict[str, Any]:
        """Extract text from PDF with page-wise content."""
        pages = []
        full_text = ""
        
        with open(pdf_file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                pages.append({
                    'page_number': page_num + 1,
                    'content': page_text
                })
                full_text += f"\\n\\n--- Page {page_num + 1} ---\\n\\n{page_text}"
        
        return {
            'pages': pages,
            'full_text': full_text,
            'total_pages': len(pages)
        }

    def detect_topics(self, text: str) -> List[str]:
        """Use AI to detect main topics from the text."""
        prompt = f"""
        Analyze this study material and extract the main topics/chapters. 
        Return only a JSON list of topic names, no other text.
        
        Text: {text[:3000]}...
        
        Format: ["Topic 1", "Topic 2", "Topic 3"]
        """
        
        messages = [
            SystemMessage(content="You are an expert at analyzing educational content and extracting key topics."),
            HumanMessage(content=prompt)
        ]
        
        response = self.llm.invoke(messages)  # Updated method
        try:
            topics = json.loads(response.content)
            return topics if isinstance(topics, list) else []
        except:
            # Fallback: extract topics using regex patterns
            return self._extract_topics_fallback(text)

    def _extract_topics_fallback(self, text: str) -> List[str]:
        """Fallback method to extract topics using patterns."""
        # Look for chapter/section headings
        patterns = [
            r'Chapter\\s+\\d+:?\\s*([^\\n]+)',
            r'Section\\s+\\d+:?\\s*([^\\n]+)',
            r'^\\d+\\.\\s*([^\\n]+)',
            r'^[A-Z][^\\n]{10,50}$'
        ]
        
        topics = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
            topics.extend(matches[:10])  # Limit to 10 topics
        
        return list(set(topics))[:10]  # Remove duplicates and limit

    def summarize_content(self, text: str, summary_type: str = "general") -> str:
        """Generate different types of summaries."""
        if summary_type == "page":
            prompt = f"Summarize this page content in 2-3 sentences focusing on key concepts:\\n\\n{text}"
        elif summary_type == "topic":
            prompt = f"Provide a comprehensive summary of this topic for exam preparation:\\n\\n{text}"
        else:
            prompt = f"Create a study-friendly summary of this material highlighting key points for exam preparation:\\n\\n{text[:4000]}"
        
        messages = [
            SystemMessage(content="You are an expert tutor who creates clear, concise summaries for students."),
            HumanMessage(content=prompt)
        ]
        
        response = self.llm.invoke(messages)
        return response.content

    def generate_flashcards(self, text: str) -> List[Dict[str, str]]:
        """Generate flashcards from content."""
        prompt = f"""
        Create flashcards from this study material. Return as JSON array with 'question' and 'answer' fields.
        Focus on key terms, definitions, and important concepts.
        Maximum 10 flashcards.
        
        Text: {text[:3000]}
        
        Format: [{{"question": "What is...", "answer": "It is..."}}, ...]
        """
        
        messages = [
            SystemMessage(content="You are an expert at creating effective study flashcards."),
            HumanMessage(content=prompt)
        ]
        
        response = self.llm.invoke(messages)
        try:
            flashcards = json.loads(response.content)
            return flashcards if isinstance(flashcards, list) else []
        except:
            return []

    def explain_concept(self, concept: str, context: str = "") -> str:
        """Explain a specific concept or term."""
        prompt = f"""
        Explain this concept in simple terms suitable for a student preparing for exams.
        
        Concept: {concept}
        Context: {context[:1000] if context else "No additional context provided"}
        
        Provide:
        1. Clear definition
        2. Why it's important
        3. Simple example if applicable
        """
        
        messages = [
            SystemMessage(content="You are a patient tutor who explains complex concepts in simple terms."),
            HumanMessage(content=prompt)
        ]
        
        response = self.llm.invoke(messages)
        return response.content

    def analyze_questions(self, questions_text: str) -> Dict[str, Any]:
        """Analyze previous year questions to extract topics and patterns."""
        prompt = f"""
        Analyze these exam questions and extract:
        1. Main topics/subjects covered
        2. Question types (MCQ, short answer, essay, etc.)
        3. Difficulty levels
        4. Frequently asked areas
        
        Return as JSON with structure:
        {{
            "topics": ["topic1", "topic2"],
            "question_types": ["MCQ", "Short Answer"],
            "difficulty_analysis": "summary",
            "frequent_areas": ["area1", "area2"]
        }}
        
        Questions: {questions_text[:3000]}
        """
        
        messages = [
            SystemMessage(content="You are an expert at analyzing exam patterns and question trends."),
            HumanMessage(content=prompt)
        ]
        
        response = self.llm.invoke(messages)
        try:
            analysis = json.loads(response.content)
            return analysis
        except:
            return {
                "topics": [],
                "question_types": [],
                "difficulty_analysis": "Unable to analyze",
                "frequent_areas": []
            }

    def map_questions_to_topics(self, study_topics: List[str], question_topics: List[str]) -> Dict[str, List[str]]:
        """Map questions to study material topics."""
        mapping = {}
        for study_topic in study_topics:
            mapped_questions = []
            for q_topic in question_topics:
                # Simple similarity check - can be enhanced with embeddings
                if any(word.lower() in q_topic.lower() for word in study_topic.split()):
                    mapped_questions.append(q_topic)
            mapping[study_topic] = mapped_questions
        return mapping


# Utility functions
def save_uploaded_file(uploaded_file, upload_path: str) -> str:
    """Save uploaded file and return the file path."""
    os.makedirs(os.path.dirname(upload_path), exist_ok=True)
    with open(upload_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    return upload_path

def cleanup_file(file_path: str):
    """Remove temporary files."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass
