"""
Predefined prompts and configurations for the chat system.
"""
from .config import get_active_config, BEHAVIOR_KEYWORDS, RESPONSE_TEMPLATES, get_prompt_for_subject

# Base system prompt for the AI tutor
BASE_SYSTEM_PROMPT = """You are Mentora, an AI study assistant. You are helpful, friendly, and concise.

Key behaviors:
- Be conversational and friendly, like a study buddy
- Keep responses concise unless specifically asked for detailed explanations
- Use simple, clear language appropriate for students
- Maintain conversation context and refer to previous messages when relevant
- For general academic questions, use your built-in knowledge
- Be encouraging and supportive in your responses

Response length guidelines:
- Default: 1-3 sentences for simple questions
- Use "Would you like me to explain more?" to offer additional detail
- Give detailed mathematical explanations when asked
- Only give detailed explanations when asked for "detailed", "elaborate", "explain in detail","explain" etc.
"""

# Prompts for different scenarios
PROMPTS = {
    "follow_up_question": """This appears to be a follow-up question related to our previous conversation about {topic}. 
Continue the discussion without searching documents unless specifically asked.""",
    
    "document_search_needed": """The user is asking about specific information that may be in their documents. 
Search the documents to provide accurate information.""",
    
    "general_question": """This is a general academic question. Answer using your knowledge without searching documents. 
Keep it concise and offer to elaborate if needed.""",
    
    "elaboration_request": """The user is asking for more detailed information. Provide a comprehensive explanation.""",
    
    "context_continuation": """Continue the conversation naturally, building on what was previously discussed about {topic}."""
}

# Keywords that indicate document search is needed
DOCUMENT_SEARCH_KEYWORDS = BEHAVIOR_KEYWORDS["document_search"]

# Keywords that indicate elaboration is requested
ELABORATION_KEYWORDS = BEHAVIOR_KEYWORDS["elaboration_requests"]

# Keywords that suggest follow-up questions
FOLLOW_UP_INDICATORS = [
    "what about", "how about", "what is", "why", "how", "when", "where",
    "advantage", "disadvantage", "benefit", "problem", "issue", "example"
]

def should_search_documents(query: str, chat_history: list = None) -> bool:
    """
    Determine if the query requires searching documents.
    """
    query_lower = query.lower()
    
    # Check for explicit document search keywords
    if any(keyword in query_lower for keyword in DOCUMENT_SEARCH_KEYWORDS):
        return True
    
    # If no previous context and asking general questions, don't search
    if not chat_history or len(chat_history) < 2:
        return False
    
    # Check if previous conversation was about general topics
    if chat_history:
        recent_messages = chat_history[-4:]  # Check last 4 messages
        general_topics = ["what is", "define", "explain", "how does", "why"]
        
        for msg in recent_messages:
            if isinstance(msg, dict) and 'content' in msg:
                content = msg['content'].lower()
                if any(topic in content for topic in general_topics):
                    # If asking follow-up about general topics, don't search documents
                    return False
    
    return False

def is_elaboration_request(query: str) -> bool:
    """
    Check if the user is requesting a detailed explanation.
    """
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in ELABORATION_KEYWORDS)

def is_follow_up_question(query: str, chat_history: list = None) -> bool:
    """
    Determine if this is a follow-up question to previous conversation.
    """
    if not chat_history or len(chat_history) < 2:
        return False
    
    query_lower = query.lower()
    
    # Check for follow-up indicators
    if any(indicator in query_lower for indicator in FOLLOW_UP_INDICATORS):
        return True
    
    return False

def get_conversation_context(chat_history: list = None) -> str:
    """
    Extract the main topic from recent conversation.
    """
    if not chat_history or len(chat_history) < 2:
        return ""
    
    # Look for topics in recent messages
    recent_content = []
    for msg in chat_history[-4:]:  # Last 4 messages
        if isinstance(msg, dict) and 'content' in msg:
            recent_content.append(msg['content'])
    
    combined_content = " ".join(recent_content).lower()
    
    # Common academic topics
    topics = {
        "machine learning": "machine learning", 
        "llm": "Large Language Models (LLMs)",
        "neural network": "neural networks",
        "statistics": "statistics",
        "probability": "probability",
        "calculus": "calculus",
        "algebra": "algebra",
        "physics": "physics",
    }
    
    for keyword, topic in topics.items():
        if keyword in combined_content:
            return topic
    
    return ""

def build_system_prompt(query: str, chat_history: list = None, document_context: str = None) -> str:
    """
    Build an appropriate system prompt based on the query and context.
    """
    prompt = BASE_SYSTEM_PROMPT
    
    if is_elaboration_request(query):
        prompt += "\n\n" + PROMPTS["elaboration_request"]
    elif should_search_documents(query, chat_history):
        prompt += "\n\n" + PROMPTS["document_search_needed"]
    elif is_follow_up_question(query, chat_history):
        topic = get_conversation_context(chat_history)
        if topic:
            prompt += "\n\n" + PROMPTS["context_continuation"].format(topic=topic)
        else:
            prompt += "\n\n" + PROMPTS["follow_up_question"].format(topic="the previous topic")
    else:
        prompt += "\n\n" + PROMPTS["general_question"]
    
    if document_context:
        prompt += f"\n\nRelevant document context:\n{document_context}"
    
    return prompt
