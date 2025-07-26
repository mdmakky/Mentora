import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('document');
  
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadSessions();
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
      const response = await api.post('/chat/sessions/', {
        title: 'New Chat Session',
        document_id: documentId
      });
      const newSession = response.data.session;
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const response = await api.get(`/chat/sessions/${sessionId}/messages/`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || sending) return;

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
      const response = await api.post(`/chat/sessions/${currentSession.id}/messages/`, {
        content: message,
        document_id: documentId
      });
      
      // Add AI response
      const aiMessage = response.data.message;
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewSession}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            New Chat Session
          </button>
        </div>
        
        <div className="overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                setCurrentSession(session);
                loadMessages(session.id);
              }}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                currentSession?.id === session.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(session.created_at).toLocaleDateString()}
              </p>
              {session.last_message && (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {session.last_message}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!currentSession ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome to AI Chat
              </h2>
              <p className="text-gray-600 mb-4">
                Start a new conversation or select an existing one
              </p>
              <button
                onClick={createNewSession}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentSession.title}
              </h2>
              {currentSession.document_title && (
                <p className="text-sm text-gray-600">
                  Document: {currentSession.document_title}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || sending}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
