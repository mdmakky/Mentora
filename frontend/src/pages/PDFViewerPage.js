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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex justify-center items-center transition-all duration-500">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-indigo-200 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-purple-400 rounded-full animate-spin animate-reverse mx-auto"></div>
          </div>
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Loading Document</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              We're preparing your PDF document for an enhanced reading experience with AI assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex justify-center items-center transition-all duration-500">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-lg w-full mx-4">
          <div className="absolute -inset-4 bg-gradient-to-r from-red-500/10 via-pink-500/10 to-red-500/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Document Error</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">{error}</p>
            <button 
              onClick={() => navigate('/study')} 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Study Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-500">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-cyan-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative overflow-hidden mb-8">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 rounded-t-3xl px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => navigate('/study')}
                    className="group p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        {document?.title}
                      </h1>
                      <p className="text-white/80 text-sm">AI-Enhanced PDF Viewer</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                    <button 
                      onClick={handleZoomOut} 
                      className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
                      title="Zoom Out"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    
                    <span className="min-w-[70px] text-center text-sm font-medium px-3 py-1 bg-white/10 rounded-lg mx-1 text-white border border-white/20">
                      {Math.round(scale * 100)}%
                    </span>
                    
                    <button 
                      onClick={handleZoomIn} 
                      className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
                      title="Zoom In"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`group p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                      sidebarOpen 
                        ? 'bg-white/20 text-white shadow-lg border border-white/30' 
                        : 'bg-white/10 hover:bg-white/20 border border-white/20'
                    }`}
                    title={sidebarOpen ? "Hide AI Assistant" : "Show AI Assistant"}
                  >
                    <svg className="w-5 h-5 text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-8">
          {/* PDF Viewer Section */}
          <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-0' : ''}`}>
            <div className="relative overflow-hidden">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl overflow-hidden">
                <div className="p-8">
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
                        <div className="flex flex-col items-center py-20">
                          <div className="relative mb-8">
                            <div className="w-16 h-16 border-4 border-indigo-200 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin animate-reverse"></div>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Loading PDF Document</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we prepare your document...</p>
                          </div>
                        </div>
                      }
                      error={
                        <div className="p-12 text-center">
                          <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Failed to Load PDF</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">We encountered an issue loading your document. Please try refreshing the page.</p>
                            <button 
                              onClick={() => window.location.reload()} 
                              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors"
                            >
                              Refresh Page
                            </button>
                          </div>
                        </div>
                      }
                    >
                      <div className="space-y-8 max-w-4xl mx-auto">
                        {Array.from(new Array(numPages), (el, index) => (
                          <div 
                            key={`page_${index + 1}`} 
                            className="group relative"
                          >
                            <div className="relative overflow-hidden">
                              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
                                {/* Page Header */}
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 px-6 py-3 border-b border-gray-200/50 dark:border-gray-600/50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <span className="text-sm font-bold text-white">{index + 1}</span>
                                      </div>
                                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                        Page {index + 1} of {numPages}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Page Content */}
                                <div className="p-6 flex justify-center bg-gray-50/30 dark:bg-gray-800/30">
                                  <div className="shadow-lg rounded-lg overflow-hidden">
                                    <Page
                                      pageNumber={index + 1}
                                      scale={scale}
                                      renderTextLayer={false}
                                      renderAnnotationLayer={false}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Document>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Chat Sidebar */}
          {sidebarOpen && (
            <div className="w-96 flex-shrink-0">
              <div className="relative overflow-hidden">
                <div className="absolute -inset-4 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-2xl"></div>
                <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl flex flex-col h-[calc(100vh-200px)]">
                  {/* Chat Header */}
                  <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 rounded-t-3xl px-6 py-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">AI Study Assistant</h3>
                        <p className="text-sm text-white/80">Intelligent document analysis</p>
                      </div>
                      {messages.length > 0 && (
                        <button 
                          onClick={handleDownloadConversation}
                          className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-105 group"
                          title="Download Conversation"
                        >
                          <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-800">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center max-w-sm">
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Welcome to AI Assistant</h4>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">I'm here to help you understand this document. Ask me anything about its content, concepts, or specific sections.</p>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <p className="flex items-center justify-center">
                              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Explain concepts
                            </p>
                            <p className="flex items-center justify-center">
                              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Answer questions
                            </p>
                            <p className="flex items-center justify-center">
                              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Provide study tips
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {messages.map((message) => (
                          <div key={message.id} className="group">
                            <div 
                              className={`relative ${
                                message.isUser ? 'ml-8' : 'mr-8'
                              }`}
                            >
                              <div 
                                className={`rounded-2xl p-4 shadow-sm border transition-all duration-200 group-hover:shadow-md ${
                                  message.isUser 
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-200' 
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'
                                }`}
                              >
                                <div className="flex items-center mb-3">
                                  <div 
                                    className={`w-7 h-7 rounded-full flex items-center justify-center mr-3 ${
                                      message.isUser ? 'bg-white/20' : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50'
                                    }`}
                                  >
                                    {message.isUser ? (
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <span className={`text-sm font-semibold ${message.isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {message.isUser ? 'You' : 'AI Assistant'}
                                    </span>
                                    <span className={`text-xs ml-2 ${message.isUser ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                      {message.timestamp.toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <div className={`leading-relaxed whitespace-pre-wrap break-words ${message.isUser ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {message.text}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {isAiTyping && (
                      <div className="mr-8">
                        <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-gray-600 dark:text-gray-400 ml-3 text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-b-3xl">
                    <div className="space-y-4">
                      <div className="flex space-x-3">
                        <div className="flex-1 relative">
                          <textarea
                            className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm shadow-sm"
                            rows="3"
                            placeholder="Ask me anything about this document..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isAiTyping}
                          />
                          <button 
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isAiTyping}
                            className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {messages.length > 0 && (
                        <div className="text-center">
                          <button
                            onClick={handleDownloadConversation}
                            className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors duration-200 hover:scale-105"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Conversation
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerPage;
