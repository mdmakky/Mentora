import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Stack,
  Avatar,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon
} from '@mui/icons-material';
import api from '../services/api';

interface Document {
  id: string;
  title: string;
  upload_date: string;
  total_pages: number;
  topics: string[];
  is_processed: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchDocuments();
    // Add welcome message
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your AI study assistant. I can help you understand concepts, answer questions about your documents, and provide explanations. What would you like to learn about today?',
        timestamp: new Date()
      }
    ]);
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/reader/documents/');
      setDocuments(response.data.documents.filter((doc: Document) => doc.is_processed));
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);
    setError(null);

    try {
      // If documents are selected, use document-specific endpoint
      if (selectedDocuments.length > 0) {
        // For now, use the concept explanation endpoint
        const response = await api.post('/reader/explain/', {
          concept: currentMessage,
          document_ids: selectedDocuments
        });

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.explanation,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // General chat without document context
        const response = await api.post('/reader/explain/', {
          concept: currentMessage
        });

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.explanation,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "Explain this concept in simple terms",
    "What are the key points?",
    "Give me practice questions",
    "Summarize the main ideas",
    "How does this relate to other topics?"
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, height: 'calc(100vh - 200px)' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          AI Study Chat 💬
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Ask questions and get intelligent explanations about your study materials
        </Typography>
      </Box>

      {/* Document Selection */}
      {documents.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Select documents for context (optional)</InputLabel>
            <Select
              multiple
              value={selectedDocuments}
              onChange={(e) => setSelectedDocuments(e.target.value as string[])}
              label="Select documents for context (optional)"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((docId) => {
                    const doc = documents.find(d => d.id === docId);
                    return (
                      <Chip
                        key={docId}
                        label={doc?.title}
                        size="small"
                        onDelete={() => {
                          setSelectedDocuments(prev => prev.filter(id => id !== docId));
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {documents.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>
                  {doc.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Chat Messages */}
      <Paper sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <Stack spacing={2}>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 1
                }}
              >
                {message.role === 'assistant' && (
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <BotIcon />
                  </Avatar>
                )}
                
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>

                {message.role === 'user' && (
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <PersonIcon />
                  </Avatar>
                )}
              </Box>
            ))}
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <BotIcon />
                </Avatar>
                <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body1" component="span">
                    Thinking...
                  </Typography>
                </Paper>
              </Box>
            )}
          </Stack>
          <div ref={messagesEndRef} />
        </Box>

        {/* Quick Prompts */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Quick prompts:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                size="small"
                variant="outlined"
                onClick={() => setCurrentMessage(prompt)}
                sx={{ mb: 1 }}
              >
                {prompt}
              </Button>
            ))}
          </Stack>
        </Box>

        {/* Message Input */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Ask a question or explain a concept..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || loading}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              <SendIcon />
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatPage;
