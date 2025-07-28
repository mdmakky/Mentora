"""
Configuration settings for the AI tutor behavior.
Admins can modify these settings to customize the AI's behavior.
"""

# Global AI Settings
AI_CONFIG = {
    # Response length settings
    "default_response_length": "concise",  # Options: "concise", "moderate", "detailed"
    "max_response_sentences": 3,  # For concise responses
    "offer_elaboration": True,  # Whether to ask "Would you like me to explain more?"
    
    # Context sensitivity
    "context_memory_messages": 10,  # How many previous messages to consider
    "context_awareness_level": "high",  # Options: "low", "medium", "high"
    
    # Document search behavior
    "auto_search_documents": False,  # Whether to automatically search documents
    "search_threshold_keywords": 5,  # Minimum keywords that suggest document search
    
    # Personality settings
    "personality": "friendly_tutor",  # Options: "formal", "friendly_tutor", "casual"
    "encouragement_level": "moderate",  # Options: "low", "moderate", "high"
    "use_student_language": True,  # Adapt to student's language complexity
}

# Custom prompts for different use cases
CUSTOM_PROMPTS = {
    # Override the base system prompt
    "base_system_override": None,  # Set to string to override default
    
    # Subject-specific prompts
    "math_tutor": """
    You are specialized in mathematics education. Break down complex problems step-by-step.
    Use clear mathematical notation and provide examples when helpful.
    """,
    
    "science_tutor": """
    You are a science education assistant. Explain concepts using real-world examples
    and encourage scientific thinking and curiosity.
    """,
    
    "language_tutor": """
    You are a language learning assistant. Focus on grammar, vocabulary, and
    clear communication. Provide corrections gently and constructively.
    """,
    
    "general_tutor": """
    You are a friendly study companion. Help with any subject while encouraging
    critical thinking and independent learning.
    """
}

# Response templates
RESPONSE_TEMPLATES = {
    "elaboration_offer": "Would you like me to explain this in more detail?",
    "clarification_request": "Could you clarify what specific aspect you'd like to know about?",
    "encouragement": "Great question! Keep exploring this topic.",
    "gentle_correction": "I think there might be a small misunderstanding here. Let me clarify:",
    "topic_transition": "That's an interesting connection! Let's explore that."
}

# Keywords for different behaviors
BEHAVIOR_KEYWORDS = {
    "elaboration_requests": [
        "explain in detail", "elaborate", "tell me more", "expand on",
        "detailed explanation", "comprehensive", "thoroughly explain",
        "give me more information", "break it down", "deep dive",
        "step by step", "in depth"
    ],
    
    "document_search": [
        "in the document", "in my notes", "according to the text", "from the PDF",
        "what does the document say", "find in document", "search document",
        "from my materials", "in the reading", "from the book", "search my documents",
        "from the document", "from my document", "in my document", "according to the document",
        "based on the document", "what does my document say", "from this document",
        "search the document", "look in the document", "check the document"
    ],
    
    "clarification_needed": [
        "i don't understand", "unclear", "confusing", "what do you mean",
        "can you clarify", "explain again", "rephrase"
    ],
    
    "quick_answer": [
        "quick", "briefly", "short answer", "in summary", "simply put"
    ]
}

def get_active_config():
    """Return the current active configuration."""
    return AI_CONFIG

def update_config(key, value):
    """Update a configuration value."""
    if key in AI_CONFIG:
        AI_CONFIG[key] = value
        return True
    return False

def get_prompt_for_subject(subject):
    """Get specialized prompt for a subject area."""
    subject_lower = subject.lower()
    
    if any(word in subject_lower for word in ["math", "calculus", "algebra", "geometry", "statistics"]):
        return CUSTOM_PROMPTS["math_tutor"]
    elif any(word in subject_lower for word in ["physics", "chemistry", "biology", "science"]):
        return CUSTOM_PROMPTS["science_tutor"]
    elif any(word in subject_lower for word in ["english", "language", "writing", "grammar"]):
        return CUSTOM_PROMPTS["language_tutor"]
    else:
        return CUSTOM_PROMPTS["general_tutor"]

def should_offer_elaboration(response_length, query):
    """Determine if we should offer to elaborate."""
    config = get_active_config()
    
    if not config["offer_elaboration"]:
        return False
    
    # Don't offer elaboration if the response is already detailed
    if response_length > config["max_response_sentences"] * 20:  # Rough word count
        return False
    
    # Don't offer if user asked for brief answer
    if any(keyword in query.lower() for keyword in BEHAVIOR_KEYWORDS["quick_answer"]):
        return False
    
    return True
