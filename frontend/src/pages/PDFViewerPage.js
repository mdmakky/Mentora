import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { explainConcept } from '../services/api';

// Set up PDF.js worker - use the version-compatible worker from react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const PDFViewerPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [document, setDocument] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/reader/documents/`);
      const data = await response.json();
      
      // Handle both array format and documents wrapper format
      const documents = data.documents || data;
      const doc = documents.find((d) => d.id === documentId);
      
      if (doc) {
        console.log('Document found:', doc);
        console.log('File URL will be:', `http://localhost:8001${doc.file}`);
        setDocument(doc);
      } else {
        setError(`Document not found. Looking for ID: ${documentId}`);
      }
    } catch (err) {
      setError('Failed to fetch document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !documentId) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputMessage.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsAiTyping(true);

    try {
      const response = await explainConcept(inputMessage.trim(), documentId);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: response.data.explanation,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleDownloadConversation = () => {
    if (messages.length === 0) return;
    
    const conversationText = [
      `AI Chat Conversation - ${document?.title || 'Document'}`,
      `Generated on: ${new Date().toLocaleString()}`,
      '='.repeat(50),
      '',
      ...messages.map(msg => [
        `${msg.isUser ? 'You' : 'AI Assistant'} (${msg.timestamp.toLocaleTimeString()}):`,
        msg.text,
        ''
      ].join('\n'))
    ].join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `conversation-${document?.title?.replace(/[^a-z0-9]/gi, '_') || 'document'}-${new Date().toISOString().split('T')[0]}.txt`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-medium text-gray-700">Loading document...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => navigate('/study')} 
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Study
        </button>
      </div>
    );
  }

  const sidebarWidth = 400;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/study')}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h1 className="text-xl font-semibold">{document?.title}</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleZoomOut} 
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            
            <span className="min-w-[60px] text-center text-sm">
              {Math.round(scale * 100)}%
            </span>
            
            <button 
              onClick={handleZoomIn} 
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              title="Zoom In"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors ml-2"
              title={sidebarOpen ? "Hide Chat" : "Show Chat"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div 
          className={`flex-1 overflow-auto flex justify-center bg-gray-100 p-6 transition-all duration-300 ${
            sidebarOpen ? `mr-[${sidebarWidth}px]` : ''
          }`}
          style={{ marginRight: sidebarOpen ? `${sidebarWidth}px` : 0 }}
        >
          {document && (
            <Document
              file={`http://localhost:8001${document.file}`}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('PDF Load Error:', error);
                console.log('Attempted URL:', `http://localhost:8001${document.file}`);
                console.log('Document object:', document);
                setError('Failed to load PDF. Please check the console for details.');
              }}
              loading={
                <div className="flex flex-col items-center py-16">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              }
              error={
                <div className="p-8">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Failed to load PDF. Please try again later.</p>
                  </div>
                </div>
              }
            >
              <div className="flex flex-col space-y-6">
                {Array.from(new Array(numPages), (el, index) => (
                  <div 
                    key={`page_${index + 1}`} 
                    className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-500 mb-2">
                      Page {index + 1} of {numPages}
                    </p>
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                ))}
              </div>
            </Document>
          )}
        </div>

        {/* AI Chat Sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 flex flex-col"
            style={{ width: sidebarWidth, marginTop: '64px' }}
          >
            {/* Chat Header */}
            <div className="bg-blue-600 text-white p-4 flex items-center space-x-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-sm text-blue-100">Ask questions about this document</p>
              </div>
              {messages.length > 0 && (
                <button 
                  onClick={handleDownloadConversation}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                  title="Download Conversation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Welcome to AI Assistant</h4>
                  <p className="text-gray-600">I'm here to help you understand this document. Ask me anything about its content, concepts, or specific sections.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="block">
                      <div 
                        className={`bg-white rounded-lg p-4 shadow-sm ${
                          message.isUser ? 'ml-8' : 'mr-8'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <div 
                            className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                              message.isUser ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                          >
                            {message.isUser ? (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {message.isUser ? 'You' : 'AI Assistant'} • {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {isAiTyping && (
                <div className="bg-white rounded-lg p-4 shadow-sm mr-8">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center mr-2">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span className="text-gray-600">AI is analyzing and preparing response...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex space-x-2">
                <textarea
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Ask about this document..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isAiTyping}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isAiTyping}
                  className="self-end bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              {messages.length > 0 && (
                <div className="mt-3 text-center">
                  <button
                    onClick={handleDownloadConversation}
                    className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center mx-auto"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewerPage;
