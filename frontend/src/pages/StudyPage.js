import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Footer from '../components/Footer';

const StudyPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reader/documents/');
      setDocuments(response.data.documents || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/reader/documents/${documentId}/delete/`);
      await fetchDocuments(); // Refresh the list
      setError(null);
    } catch (err) {
      setError('Failed to delete document');
      console.error('Error deleting document:', err);
    }
  };

  const handleViewDocument = (document) => {
    navigate(`/pdf/${document.id}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex items-center justify-center transition-all duration-500">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-indigo-200 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-purple-400 rounded-full animate-spin animate-reverse mx-auto"></div>
          </div>
          <p className="text-xl font-medium text-gray-700 dark:text-gray-300 animate-pulse">Loading your study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-500">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-blue-400/10 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden mb-12">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl p-10">
            <div className="flex items-center">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-105 transition-all duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="ml-8">
                <h1 className="text-5xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">Study Dashboard</h1>
                <p className="text-2xl text-gray-600 dark:text-gray-400 font-medium">Manage your documents and track your learning progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="relative mb-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-2xl blur"></div>
            <div className="relative bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50 border border-red-200/50 dark:border-red-800/50 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/50 rounded-2xl flex items-center justify-center mr-6">
                  <svg className="h-7 w-7 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">Error</h3>
                  <p className="text-red-800 dark:text-red-200 text-lg">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-gray-200/20 to-gray-300/20 rounded-3xl blur-2xl"></div>
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl">
              <div className="text-center py-24">
                <div className="relative mb-10">
                  <div className="absolute -inset-4 bg-gradient-to-r from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-3xl blur-xl"></div>
                  <div className="relative w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                    <svg className="w-16 h-16 text-gray-400 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">No documents found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-10 text-xl max-w-md mx-auto">
                  Upload your first document to start studying with AI-powered insights and analysis
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white font-semibold rounded-2xl hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-700 dark:hover:to-purple-800 transition-all duration-300 hover:scale-105 shadow-xl text-lg"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {documents.map((doc) => (
              <div key={doc.id} className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-orange-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-xl card-hover overflow-hidden h-full flex flex-col">
                  <div className="p-8 flex-1 flex flex-col">
                    {/* Document Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="relative group-hover:scale-110 transition-transform duration-300">
                          <div className="absolute -inset-2 bg-gradient-to-r from-red-400 to-orange-500 rounded-2xl blur opacity-30"></div>
                          <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-2xl flex items-center justify-center shadow-xl">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight line-clamp-2">
                            {doc.title}
                          </h3>
                          <div className="flex items-center">
                            {doc.is_processed ? (
                              <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-800 dark:text-green-200 text-sm font-semibold rounded-full border border-green-300 dark:border-green-700 shadow-sm">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                                Ready to Study
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 text-orange-800 dark:text-orange-200 text-sm font-semibold rounded-full border border-orange-300 dark:border-orange-700 shadow-sm">
                                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
                                Processing...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="space-y-4 mb-8 flex-1">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{doc.total_pages}</span>
                              <span className="ml-1 text-gray-600 dark:text-gray-400">pages</span>
                            </div>
                          </div>
                          <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0v1m6-1v1m-6 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-gray-900 dark:text-gray-100 font-semibold">Uploaded {formatDate(doc.upload_date)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Topics */}
                    {doc.topics && doc.topics.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {doc.topics.slice(0, 3).map((topic, index) => (
                            <span
                              key={index}
                              className="inline-block bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-sm px-4 py-2 rounded-full border border-indigo-300 dark:border-indigo-700 font-semibold shadow-sm"
                            >
                              {topic}
                            </span>
                          ))}
                          {doc.topics.length > 3 && (
                            <span className="inline-block bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700/50 dark:to-gray-600/50 text-gray-800 dark:text-gray-200 text-sm px-4 py-2 rounded-full border border-gray-400 dark:border-gray-600 font-semibold shadow-sm">
                              +{doc.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3 mt-auto pt-4">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 text-white px-4 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-800 dark:hover:from-indigo-800 dark:hover:to-purple-900 transition-all duration-300 font-semibold flex items-center justify-center hover:scale-105 shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/chat?document=${doc.id}`)}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 dark:from-green-700 dark:to-emerald-800 text-white px-4 py-3 rounded-xl hover:from-green-700 hover:to-emerald-800 dark:hover:from-green-800 dark:hover:to-emerald-900 transition-all duration-300 font-semibold flex items-center justify-center hover:scale-105 shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white px-4 py-3 rounded-xl hover:from-red-700 hover:to-red-800 dark:hover:from-red-800 dark:hover:to-red-900 transition-all duration-300 font-semibold hover:scale-105 shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Study Overview Stats */}
        {documents.length > 0 && (
          <div className="mt-16 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 px-10 py-8">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-white/20 rounded-2xl blur"></div>
                    <div className="relative w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-6">
                    <h3 className="text-3xl font-bold text-white mb-1">Study Overview</h3>
                    <p className="text-white/80 text-lg">Your learning progress at a glance</p>
                  </div>
                </div>
              </div>
              <div className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 shadow-lg card-hover">
                      <div className="relative mb-6">
                        <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-30"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-2">{documents.length}</div>
                      <div className="text-gray-700 dark:text-gray-300 font-bold text-lg">Documents</div>
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl border border-green-200/50 dark:border-green-800/50 shadow-lg card-hover">
                      <div className="relative mb-6">
                        <div className="absolute -inset-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-30"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-4xl font-black text-green-600 dark:text-green-400 mb-2">
                        {documents.reduce((total, doc) => total + doc.total_pages, 0)}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 font-bold text-lg">Total Pages</div>
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl border border-purple-200/50 dark:border-purple-800/50 shadow-lg card-hover">
                      <div className="relative mb-6">
                        <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur opacity-30"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-2">
                        {documents.filter(doc => doc.is_processed).length}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 font-bold text-lg">Ready to Study</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default StudyPage;
