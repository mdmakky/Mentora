import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { ragChat, deleteChatSession } from '../services/api';
import '../styles/message-formatting.css';

// Function to format AI responses with better typography
const formatAIResponse = (text) => {
  if (!text) return '';
  
  return text
    // Format bold text with **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Format bullet points starting with * or •
    .replace(/^[\*\•]\s*(.+)$/gm, '<div class="bullet-item"><span class="bullet-marker">•</span><span class="list-content">$1</span></div>')
    // Format numbered lists
    .replace(/^(\d+)\.\s*(.+)$/gm, '<div class="numbered-item"><span class="number-marker">$1.</span><span class="list-content">$2</span></div>')
    // Format headings with ### or ##
    .replace(/^###\s*(.+)$/gm, '<h4>$1</h4>')
    .replace(/^##\s*(.+)$/gm, '<h3>$1</h3>')
    // Format emphasis with *text* (but not **text**)
    .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Format code blocks with backticks
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Format sections that start with capital letters and colon (like "Data Points:")
    .replace(/^([A-Z][^:]*:)(\s*)/gm, '<strong>$1</strong>$2')
    // Convert line breaks to proper HTML
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
};

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('document');
  
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchDocuments, setSearchDocuments] = useState(false); // New state for PDF search toggle
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  // Prevent body scrolling when chat page is active
  useEffect(() => {
    document.body.classList.add('chat-page-active');
    return () => {
      document.body.classList.remove('chat-page-active');
    };
  }, []);

  const loadSessions = async () => {
    try {
      const response = await api.get('/chat/sessions/');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      console.log('Creating new session...');
      const response = await api.post('/chat/sessions/', {
        title: 'New Chat Session',
        document_id: documentId
      });
      console.log('Session created:', response.data);
      
      // Backend returns session_id, title, document_id directly, not nested in a session object
      const newSession = {
        id: response.data.session_id,
        title: response.data.title,
        document_title: null, // Will be filled when we reload sessions
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message: null
      };
      
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]); // Clear messages immediately for new session
      
      console.log('New session set as current:', newSession);
      
      // Try to load messages, but don't block if it fails
      try {
        await loadMessages(newSession.id);
        console.log('Messages loaded for new session');
      } catch (loadError) {
        console.error('Error loading messages for new session (continuing anyway):', loadError);
        // Continue anyway since it's a new session with no messages
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId, event) => {
    event.stopPropagation(); // Prevent triggering the session click
    try {
      console.log('Deleting session:', sessionId);
      await deleteChatSession(sessionId);
      
      // Update sessions list
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If the deleted session was the current one, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
      
      console.log('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      console.error('Error response:', error.response);
      // You could add a toast notification here to show the error to the user
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      console.log('Loading messages for session:', sessionId);
      const response = await api.get(`/chat/sessions/${sessionId}/messages/`);
      console.log('Messages response:', response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      console.error('Error details:', error.response?.data);
      // Set empty messages array if loading fails
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending || !currentSession) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Use the session-based chat endpoint which saves messages to database
      console.log('Sending message via session endpoint:', message, 'Search docs:', searchDocuments);
      const response = await api.post(`/chat/sessions/${currentSession.id}/messages/`, {
        message: message,
        document_id: documentId,
        search_documents: searchDocuments
      });
      
      console.log('Session message response:', response.data);
      
      // Add only the AI message from the response (user message already added)
      const aiMessage = {
        id: response.data.ai_response.id,
        type: 'ai',
        content: response.data.ai_response.content,
        timestamp: response.data.ai_response.timestamp
      };
      
      // Update messages with the AI response
      setMessages(prev => [...prev, aiMessage]);
      
      // Reload sessions to update the last_message and potentially updated title
      await loadSessions();
      
    } catch (error) {
      console.error('Session message error:', error);
      
      // Fallback to RAG if session endpoint fails
      try {
        console.log('Falling back to RAG chat');
        
        // Get all available documents to search across
        const documentsResponse = await api.get('/reader/documents/');
        const allDocuments = documentsResponse.data.documents || [];
        const allDocumentIds = allDocuments.map(doc => doc.id);
        
        // Prepare chat history for better context understanding
        const messagesBeforeCurrent = messages;
        const recentMessages = messagesBeforeCurrent.slice(-6);
        const chatHistory = recentMessages.map(msg => ({
          message_type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        }));
        
        const ragResponse = await ragChat(message, allDocumentIds, chatHistory);
        
        if (!ragResponse || !ragResponse.data) {
          throw new Error('Invalid response from RAG service');
        }
        
        const aiResponse = {
          id: Date.now().toString() + '_ai',
          type: 'ai',
          content: ragResponse.data.response || ragResponse.data.answer || 'I found some information in your documents, but had trouble formatting the response.',
          timestamp: new Date().toISOString(),
          context: ragResponse.data.context || null,
          sources: ragResponse.data.sources || null,
          sourceChunks: ragResponse.data.source_chunks || 0
        };

        setMessages(prev => [...prev, aiResponse]);
        
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        const errorMessage = {
          id: Date.now().toString() + '_ai',
          type: 'ai',
          content: 'Sorry, I encountered an error. Please make sure your documents are uploaded and try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-slate-800 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-16 h-16 border-4 border-indigo-200 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full mx-auto animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading your chat sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-slate-800 flex transition-colors duration-300 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 shadow-lg flex flex-col h-full">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 p-6 flex-shrink-0 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white mb-1">Chat Sessions</h1>
              <p className="text-indigo-100 text-sm opacity-90">Manage your conversations</p>
            </div>
          </div>
        </div>
        
        {/* New Chat Button */}
        <div className="px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
          <button
            onClick={createNewSession}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-4 py-3.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-sm flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat Session</span>
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 min-h-0 px-4 py-2">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-gray-600 dark:text-gray-300 font-semibold mb-2">No chat sessions yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start your first conversation above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.filter(session => session && session.id).map((session) => (
                <div
                  key={session.id}
                  className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                    currentSession?.id === session.id 
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 border-indigo-200 dark:border-indigo-600 shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-600' 
                      : 'bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm border-gray-200/50 dark:border-gray-600/50 hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500'
                  }`}
                >
                  <div className="flex items-start" onClick={() => {
                    if (session && session.id) {
                      setCurrentSession(session);
                      loadMessages(session.id);
                    }
                  }}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
                      currentSession?.id === session.id 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                        : 'bg-gradient-to-br from-green-400 to-emerald-600'
                    } transition-transform duration-200`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">{session.title || 'Untitled Chat'}</h3>
                      <div className="flex items-center mt-1">
                        <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0v1m6-1v1m-6 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3" />
                        </svg>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {session.created_at ? new Date(session.created_at).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : 'Unknown date'}
                        </p>
                      </div>
                      {(session.first_user_message || session.last_message) && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                          {session.first_user_message || session.last_message}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(event) => deleteSession(session.id, event)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg ml-2"
                      title="Delete session"
                    >
                      <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {!currentSession ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                  Welcome to AI Chat
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                Start a new conversation with your AI assistant or select an existing chat session
              </p>
              <button
                onClick={createNewSession}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-700 dark:hover:to-purple-800 transition-all duration-200 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-br from-slate-50/50 to-gray-100/50 dark:from-gray-900/50 dark:to-slate-800/50 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="max-w-2xl mx-auto text-center">
                    {/* Main greeting */}
                    <div className="mb-8">
                      <h1 className="text-4xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                          Hello! I'm Mentora
                        </span>
                      </h1>
                      <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
                        Your AI study companion
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        I can help you understand your documents, answer questions, and explore topics together
                      </p>
                    </div>

                    {/* Suggestion cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <button
                        onClick={() => setInputMessage("Summarize my documents")}
                        className="group p-6 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-2xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Document Summary</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Get key insights from your uploaded documents</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setInputMessage("Explain a concept from my documents")}
                        className="group p-6 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-2xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Concept Explanation</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Understand complex topics with detailed explanations</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setInputMessage("Generate study questions from my documents")}
                        className="group p-6 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-2xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Study Questions</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Create practice questions to test your knowledge</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setInputMessage("What topics are covered in my documents?")}
                        className="group p-6 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-2xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Topic Overview</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Discover what subjects your documents cover</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Additional helpful text */}
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Or ask me anything else! I can help with both your documents and general academic questions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start max-w-xs lg:max-w-2xl ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          message.type === 'user' 
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 ml-3' 
                            : 'bg-gradient-to-br from-green-500 to-emerald-600 mr-3'
                        }`}>
                          {message.type === 'user' ? (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                              : 'bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {message.type === 'user' ? (
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          ) : (
                            <div 
                              className="formatted-content leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: formatAIResponse(message.content)
                              }}
                            />
                          )}
                          <p
                            className={`text-xs mt-2 ${
                              message.type === 'user' ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
              
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-start max-w-xs lg:max-w-2xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 text-gray-900 dark:text-gray-100 px-4 py-3 rounded-2xl shadow-sm">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 p-4 shadow-lg">
              <div className="max-w-4xl mx-auto">
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={currentSession ? "Type your message..." : "Select or create a chat session to start chatting..."}
                      className="w-full resize-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100"
                      rows="2"
                      disabled={sending || !currentSession}
                    />
                  </div>
                  
                  {/* PDF Search Toggle Button */}
                  <button
                    onClick={() => setSearchDocuments(!searchDocuments)}
                    className={`px-3 py-3 rounded-xl transition-all duration-200 self-end shadow-lg flex items-center justify-center min-w-[50px] ${
                      searchDocuments 
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    title={searchDocuments ? "Document search enabled - Click to disable" : "Document search disabled - Click to enable"}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || sending || !currentSession}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white px-5 py-3 rounded-xl hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-700 dark:hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 self-end shadow-lg flex items-center justify-center min-w-[70px]"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Status indicator for document search */}
                {searchDocuments && (
                  <div className="mt-2 flex items-center text-sm text-orange-600 dark:text-orange-400">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    {currentSession?.document_title 
                      ? `Document search enabled - searching in "${currentSession.document_title}"`
                      : "Document search enabled - searching all your documents"}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
