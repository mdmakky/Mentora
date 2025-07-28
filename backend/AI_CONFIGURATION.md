# AI Tutor Configuration Guide

This guide explains how to customize the AI tutor's behavior in Mentora.

## Overview

The AI tutor has been designed with context awareness and customizable behavior. It can:

1. **Maintain conversation context** - Remembers what you've been discussing
2. **Provide concise responses** - Gives brief answers unless asked for details
3. **Smart document searching** - Only searches documents when needed
4. **Customizable prompts** - Behavior can be tailored to your needs

## Key Features

### Context-Aware Responses
- The AI remembers your conversation and provides relevant follow-up answers
- Example: If you ask "What is linear regression?" and then "What are its advantages?", it knows you're still talking about linear regression

### Smart Document Search
- **Chat Page**: Only searches documents when you explicitly ask (e.g., "search my documents for...")
- **PDF Viewer Page**: Always searches the document you're viewing for relevant information
- This prevents unnecessary document searches for general questions

### Response Length Control
- **Default**: Concise responses (1-3 sentences)
- **Detailed**: When you ask to "explain in detail" or "elaborate"
- **Brief**: Even shorter when you ask for "quick" or "brief" answers

## Configuration Options

### API Endpoints

#### Get Current Configuration
```bash
GET /api/chat/admin/config/
```

#### Update Configuration
```bash
POST /api/chat/admin/config/
Content-Type: application/json

{
  "config": {
    "default_response_length": "concise",
    "max_response_sentences": 3,
    "offer_elaboration": true
  }
}
```

#### Test Prompts
```bash
POST /api/chat/admin/test-prompt/
Content-Type: application/json

{
  "query": "What is calculus?",
  "chat_history": [],
  "prompt_type": "math_tutor"
}
```

### Configuration Parameters

| Parameter | Options | Description |
|-----------|---------|-------------|
| `default_response_length` | "concise", "moderate", "detailed" | Default response style |
| `max_response_sentences` | Number | Max sentences for concise responses |
| `offer_elaboration` | true/false | Whether to ask "Want me to explain more?" |
| `context_memory_messages` | Number | How many previous messages to remember |
| `auto_search_documents` | true/false | Whether to automatically search documents |
| `personality` | "formal", "friendly_tutor", "casual" | AI personality style |

## Customizing Prompts

### Built-in Prompt Types
- `general_tutor`: Friendly study companion
- `math_tutor`: Specialized for mathematics
- `science_tutor`: Focused on science subjects
- `language_tutor`: For language learning

### Keywords That Trigger Behaviors

#### Document Search
- "in the document"
- "search my documents"
- "according to the text"
- "from the PDF"

#### Detailed Explanations
- "explain in detail"
- "elaborate"
- "tell me more"
- "step by step"

#### Quick Answers
- "briefly"
- "quick answer"
- "in summary"

## Examples

### Basic Conversation
```
User: "What is photosynthesis?"
AI: "Photosynthesis is how plants convert sunlight into energy using carbon dioxide and water."

User: "What are the steps?"
AI: "The main steps are light absorption, water splitting, and glucose formation. Would you like me to explain more?"

User: "explain in detail"
AI: [Provides detailed step-by-step explanation]
```

### Document-Specific Query
```
User: "search my documents for information about cell division"
AI: [Searches documents and provides relevant information]
```

## Modifying Behavior

To customize the AI's behavior, you can:

1. **Change response length**: Modify `max_response_sentences`
2. **Adjust personality**: Change `personality` setting
3. **Control document search**: Set `auto_search_documents`
4. **Add custom keywords**: Edit `BEHAVIOR_KEYWORDS` in `config.py`
5. **Create custom prompts**: Add to `CUSTOM_PROMPTS` in `config.py`

## Files to Modify

- `chat/config.py` - Main configuration settings
- `chat/prompts.py` - Prompt logic and keywords
- `chat/admin_views.py` - Admin API endpoints

## Best Practices

1. **Test changes** using the `/admin/test-prompt/` endpoint
2. **Start with small adjustments** to response length and personality
3. **Monitor chat quality** after making changes
4. **Keep backups** of working configurations
5. **Use subject-specific prompts** for specialized tutoring

## Troubleshooting

- If responses are too verbose: Decrease `max_response_sentences`
- If AI searches documents unnecessarily: Set `auto_search_documents` to false
- If context isn't maintained: Increase `context_memory_messages`
- If responses are too formal: Change `personality` to "friendly_tutor"
