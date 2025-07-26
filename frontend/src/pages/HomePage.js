import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import { getDocuments, uploadDocument } from '../services/api';

const HomePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setUploadFile(file);
        setDocumentTitle(file.name.replace('.pdf', ''));
        setUploadDialogOpen(true);
      }
    },
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await getDocuments();
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !documentTitle.trim()) return;

    setUploading(true);
    try {
      await uploadDocument(uploadFile, documentTitle);
      setUploadDialogOpen(false);
      setUploadFile(null);
      setDocumentTitle('');
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 mb-8 px-4">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome to Mentora! 🎓
        </h1>
        <p className="text-xl text-gray-600">
          Your AI-powered study companion for smarter learning
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Study with AI</h3>
              <p className="text-gray-600">Browse and learn from your documents</p>
            </div>
          </div>
          <Link 
            to="/study" 
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Start Studying
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-lg mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Chat</h3>
              <p className="text-gray-600">Get instant answers to your questions</p>
            </div>
          </div>
          <Link 
            to="/chat" 
            className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Chat with AI
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-lg mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
              <p className="text-gray-600">Track your learning progress</p>
            </div>
          </div>
          <Link 
            to="/analytics" 
            className="inline-block bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
          >
            View Analytics
          </Link>
        </div>
      </div>

      {/* Recent Documents */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Your Documents ({documents.length})
      </h2>
      
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No documents uploaded yet
            </h3>
            <p className="text-gray-500 mb-6">
              Upload your first PDF to get started with AI-powered studying!
            </p>
            <button 
              onClick={() => setUploadDialogOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Your First Document
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                  {doc.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {doc.total_pages} pages • Uploaded {formatDate(doc.upload_date)}
                </p>
                <div className="mb-4">
                  {doc.topics && doc.topics.slice(0, 3).map((topic, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2 mb-2"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/pdf/${doc.id}`}
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-center hover:bg-blue-600 transition-colors text-sm"
                  >
                    View PDF
                  </Link>
                  <Link
                    to={`/chat?document=${doc.id}`}
                    className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-center hover:bg-green-600 transition-colors text-sm"
                  >
                    Chat
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setUploadDialogOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Upload Dialog */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {uploadFile ? (
                <p className="text-gray-700">Selected: {uploadFile.name}</p>
              ) : (
                <p className="text-gray-600">
                  {isDragActive
                    ? 'Drop the PDF here...'
                    : 'Drag & drop a PDF file here, or click to select'}
                </p>
              )}
            </div>
            
            <input
              type="text"
              placeholder="Document Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
            />
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setUploadDialogOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || !documentTitle.trim() || uploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
