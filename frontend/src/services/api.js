import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirect to landing page
    }
    return Promise.reject(error);
  }
);

// Authentication functions
export const register = (userData) => {
  return api.post('/auth/register', userData);
};

export const login = (credentials) => {
  return api.post('/auth/login', credentials);
};

export const logout = () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    return api.post('/auth/logout');
  }
  return Promise.resolve();
};

export const getProfile = () => {
  return api.get('/auth/profile');
};

export const requestPasswordReset = (email) => {
  return api.post('/auth/password-reset/request', { email });
};

export const verifyResetCode = (email, code) => {
  return api.post('/auth/password-reset/verify', { email, code });
};

export const completePasswordReset = (email, code, new_password) => {
  return api.post('/auth/password-reset/complete', { email, code, new_password });
};

export const updateProfile = (data) => {
  return api.put('/auth/profile', data);
};

export const changePassword = (passwords) => {
  return api.post('/auth/change-password', passwords);
};

export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/auth/upload-avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Document functions
export const getDocuments = () => {
  return api.get('/reader/documents');
};

export const uploadDocument = (file, title) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Send title as query parameter
  const url = title 
    ? `/reader/documents/upload?title=${encodeURIComponent(title)}`
    : '/reader/documents/upload';
  
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getDocument = (id) => {
  return api.get(`/reader/documents/${id}`);
};

export const getDocumentFile = (id) => {
  const token = localStorage.getItem('authToken');
  return `${API_BASE_URL}/reader/documents/${id}/file?token=${token}`;
};

export const deleteDocument = (id) => {
  return api.delete(`/reader/documents/${id}`);
};

// Chat functions
export const getChatSessions = () => {
  return api.get('/chat/sessions');
};

export const createChatSession = (title, documentId = null) => {
  return api.post('/chat/sessions', {
    title,
    document_id: documentId,
  });
};

export const deleteChatSession = (sessionId) => {
  return api.delete(`/chat/sessions/${sessionId}`);
};

export const getChatMessages = (sessionId) => {
  return api.get(`/chat/sessions/${sessionId}/messages`);
};

export const sendMessage = (sessionId, content, documentId = null, searchDocuments = false) => {
  return api.post(`/chat/sessions/${sessionId}/messages`, {
    content,
  });
};

export const explainConcept = (concept, documentId = null, chatHistory = null) => {
  return api.post('/chat/explain', {
    concept,
    document_id: documentId,
    chat_history: chatHistory,
  });
};

// Analytics functions
export const getStudyInsights = () => {
  return api.get('/analytics/insights');
};

export const getStudyProgress = () => {
  return api.get('/analytics/progress');
};

export const getDocumentAnalytics = (documentId) => {
  return api.get(`/analytics/documents/${documentId}`);
};

export const recordStudySession = (duration, documentId = null) => {
  const params = {
    duration,
    pages_viewed: 0,
  };
  if (documentId) {
    params.document_id = documentId;
  }
  return api.post('/analytics/sessions/', null, { params });
};

// Remove functions not implemented in backend
// Learning functions - Not yet implemented in FastAPI backend
// export const generateQuestions = (documentId, pageNumber = null) => {
//   return api.post('/chat/generate-questions/', {
//     document_id: documentId,
//     page_number: pageNumber,
//   });
// };

// export const generateSummary = (documentId, pageRange = null) => {
//   return api.post('/chat/generate-summary/', {
//     document_id: documentId,
//     page_range: pageRange,
//   });
// };

// RAG (Retrieval Augmented Generation) functions - Not yet implemented
// export const ragChat = (query, documentIds = null, chatHistory = null) => {
//   return api.post('/reader/chat/', {
//     query,
//     document_ids: documentIds,
//     chat_history: chatHistory,
//   });
// };

// export const semanticSearch = (query, documentIds = null, topK = 5) => {
//   return api.post('/reader/search/', {
//     query,
//     document_ids: documentIds,
//     top_k: topK,
//   });
// };

export default api;
