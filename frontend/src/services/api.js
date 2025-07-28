import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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
  return api.get(`/reader/documents/${id}/summary/`);
};

export const getDocumentFile = (id) => {
  return `${API_BASE_URL}/reader/documents/${id}/file/`;
};

export const deleteDocument = (id) => {
  return api.delete(`/reader/documents/${id}/delete/`);
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

export const deleteChatSession = (sessionId) => {
  return api.delete(`/chat/sessions/${sessionId}/`);
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

export const explainConcept = (concept, documentId, chatHistory = null) => {
  return api.post('/chat/explain/', {
    concept,
    document_id: documentId,
    chat_history: chatHistory,
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

// RAG (Retrieval Augmented Generation) functions
export const ragChat = (query, documentIds = null, chatHistory = null) => {
  return api.post('/reader/chat/', {
    query,
    document_ids: documentIds,
    chat_history: chatHistory,
  });
};

export const semanticSearch = (query, documentIds = null, topK = 5) => {
  return api.post('/reader/search/', {
    query,
    document_ids: documentIds,
    top_k: topK,
  });
};

export default api;
