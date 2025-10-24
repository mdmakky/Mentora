"""
AI Service - Google Gemini with LangChain
Handles all AI-related functionality for chat and document Q&A
"""

from typing import List, Dict, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.core.config import settings


class AIService:
    """
    Manages AI interactions using Google Gemini through LangChain
    """
    
    def __init__(self):
        """Initialize the AI service with Google Gemini"""
        if not settings.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is not set in environment variables")
        
        # Initialize Gemini model through LangChain
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
            convert_system_message_to_human=True  # Gemini requirement
        )
    
    async def get_ai_response(
        self,
        user_message: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Get AI response for a simple message without document context
        
        Args:
            user_message: The user's question
            history: Previous conversation history
        
        Returns:
            AI's response as string
        """
        try:
            messages = []
            
            # Add conversation history if provided
            if history:
                for msg in history:
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # Add current message
            messages.append(HumanMessage(content=user_message))
            
            # Get response from Gemini
            response = await self.llm.agenerate([messages])
            return response.generations[0][0].text
            
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}"
    
    async def get_ai_response_with_context(
        self,
        user_message: str,
        context: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Get AI response with document context (RAG - Retrieval Augmented Generation)
        
        Args:
            user_message: The user's question
            context: Relevant text from the document
            history: Previous conversation history
        
        Returns:
            AI's response as string
        """
        try:
            messages = []
            
            # System message with document context
            system_prompt = f"""You are Mentora, an AI study assistant helping students understand their documents.

Here is the relevant context from the document:

{context}

Based on this context, answer the student's questions clearly and helpfully. 
Be educational, explain concepts well, and use examples from the document when relevant."""
            
            # Gemini doesn't support system messages directly, so we add it as the first human message
            messages.append(HumanMessage(content=system_prompt))
            messages.append(AIMessage(content="I understand. I'll help you with your questions about the document."))
            
            # Add conversation history
            if history:
                for msg in history:
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # Add current question
            messages.append(HumanMessage(content=user_message))
            
            # Get response from Gemini
            response = await self.llm.agenerate([messages])
            return response.generations[0][0].text
            
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}"
    
    async def explain_concept(
        self,
        concept: str,
        context: Optional[str] = None
    ) -> str:
        """
        Explain a specific concept, optionally using document context
        
        Args:
            concept: The concept to explain
            context: Optional document context
        
        Returns:
            Explanation as string
        """
        if context:
            prompt = f"""Based on this document content:

{context}

Please explain this concept in detail: {concept}

Provide a clear, educational explanation."""
        else:
            prompt = f"Please explain this concept in detail: {concept}"
        
        try:
            messages = [HumanMessage(content=prompt)]
            response = await self.llm.agenerate([messages])
            return response.generations[0][0].text
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}"
    
    async def explain_concept_with_history(
        self,
        concept: str,
        context: Optional[str] = None,
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Explain a concept with chat history support and RAG context
        
        Args:
            concept: The question/concept to explain
            context: Document context from vector search
            chat_history: Previous conversation messages
        
        Returns:
            AI-generated explanation
        """
        messages = []
        
        # Add system context if available
        if context:
            system_prompt = f"""You are Mentora, an AI study assistant. You have access to relevant sections from the student's document.

Document Context:
{context}

Based on this context, answer the student's questions clearly and helpfully. If the answer isn't in the context, use your general knowledge but mention that."""
            
            messages.append(HumanMessage(content=system_prompt))
            messages.append(AIMessage(content="I understand. I'll help answer questions based on the document context provided."))
        
        # Add chat history for continuity
        if chat_history:
            for msg in chat_history[-6:]:  # Last 6 messages
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
        
        # Add current question
        messages.append(HumanMessage(content=concept))
        
        try:
            response = await self.llm.agenerate([messages])
            return response.generations[0][0].text
        except Exception as e:
            print(f"AI Error: {str(e)}")
            return f"Sorry, I encountered an error: {str(e)}"


# Create global instance
ai_service = AIService() if settings.GOOGLE_API_KEY else None


def get_ai_service() -> AIService:
    """
    Dependency function to get AI service instance
    """
    if ai_service is None:
        raise ValueError("AI Service not initialized. Check GOOGLE_API_KEY.")
    return ai_service
