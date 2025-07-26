import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Document functions
export const getDocuments = () => {
  return api.get('/reader/documents/');
};

export const uploadDocument = (file, title) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  
  return api.post('/reader/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getDocument = (id) => {
  return api.get(`/reader/documents/${id}/`);
};

export const deleteDocument = (id) => {
  return api.delete(`/reader/documents/${id}/`);
};

// Chat functions
export const getChatSessions = () => {
  return api.get('/chat/sessions/');
};

export const createChatSession = (title, documentId = null) => {
  return api.post('/chat/sessions/', {
    title,
    document_id: documentId,
  });
};

export const getChatMessages = (sessionId) => {
  return api.get(`/chat/sessions/${sessionId}/messages/`);
};

export const sendMessage = (sessionId, content, documentId = null) => {
  return api.post(`/chat/sessions/${sessionId}/messages/`, {
    content,
    document_id: documentId,
  });
};

export const explainConcept = (concept, documentId) => {
  return api.post('/chat/explain/', {
    concept,
    document_id: documentId,
  });
};

// Analytics functions
export const getStudyInsights = () => {
  return api.get('/analytics/insights/');
};

export const getStudyProgress = () => {
  return api.get('/analytics/progress/');
};

export const getDocumentAnalytics = (documentId) => {
  return api.get(`/analytics/documents/${documentId}/`);
};

export const recordStudySession = (documentId, duration, pagesViewed) => {
  return api.post('/analytics/sessions/', {
    document_id: documentId,
    duration,
    pages_viewed: pagesViewed,
  });
};

// Learning functions
export const generateQuestions = (documentId, pageNumber = null) => {
  return api.post('/chat/generate-questions/', {
    document_id: documentId,
    page_number: pageNumber,
  });
};

export const generateSummary = (documentId, pageRange = null) => {
  return api.post('/chat/generate-summary/', {
    document_id: documentId,
    page_range: pageRange,
  });
};

export default api;
