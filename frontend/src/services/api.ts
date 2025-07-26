import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Document {
  id: string;
  title: string;
  upload_date: string;
  total_pages: number;
  topics: string[];
  is_processed: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  document_title?: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  page_reference?: number;
}

export interface StudyInsights {
  overview: {
    total_documents: number;
    total_study_time: number;
    total_sessions: number;
    total_questions: number;
    study_streak: number;
  };
  weekly_stats: {
    time_spent: number;
    sessions: number;
    avg_session_time: number;
  };
  most_studied_topics: Array<{
    topic: string;
    time: number;
  }>;
  difficult_topics: Array<{
    topic: string;
    difficulty_level: number;
    time_spent: number;
    questions_asked: number;
  }>;
  recommendations: Array<{
    type: string;
    title: string;
    message: string;
  }>;
}

// Document API calls
export const uploadDocument = (file: File, title: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  
  return api.post('/reader/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getDocuments = () => {
  return api.get('/reader/documents/');
};

export const getDocumentSummary = (documentId: string, pageNumber?: number) => {
  const params = pageNumber ? { page: pageNumber } : {};
  return api.get(`/reader/documents/${documentId}/summary/`, { params });
};

export const generateFlashcards = (documentId: string, topic?: string) => {
  return api.post('/reader/flashcards/generate/', {
    document_id: documentId,
    topic,
  });
};

export const explainConcept = (concept: string, documentId?: string, pageNumber?: number) => {
  return api.post('/reader/explain/', {
    concept,
    document_id: documentId,
    page_number: pageNumber,
  });
};

// Chat API calls
export const createChatSession = (documentId?: string, title?: string) => {
  return api.post('/chat/sessions/', {
    document_id: documentId,
    title,
  });
};

export const getChatSessions = () => {
  return api.get('/chat/sessions/');
};

export const getChatMessages = (sessionId: string) => {
  return api.get(`/chat/sessions/${sessionId}/messages/`);
};

export const sendChatMessage = (sessionId: string, message: string, pageNumber?: number) => {
  return api.post(`/chat/sessions/${sessionId}/messages/`, {
    message,
    page_number: pageNumber,
  });
};

export const generateStudyPlan = (documentId: string, daysAvailable: number, hoursPerDay: number, focusAreas?: string[]) => {
  return api.post('/chat/study-plan/', {
    document_id: documentId,
    days_available: daysAvailable,
    hours_per_day: hoursPerDay,
    focus_areas: focusAreas,
  });
};

// Analytics API calls
export const getStudyInsights = () => {
  return api.get('/analytics/insights/');
};

export const getStudyProgress = (days: number = 30) => {
  return api.get('/analytics/progress/', { params: { days } });
};

export const setTopicDifficulty = (topicId: string, difficultyLevel: number, timeSpent: number = 0) => {
  return api.post('/analytics/topic-difficulty/', {
    topic_id: topicId,
    difficulty_level: difficultyLevel,
    time_spent: timeSpent,
  });
};

export const startStudySession = (documentId?: string, topicId?: string) => {
  return api.post('/analytics/session/', {
    action: 'start',
    document_id: documentId,
    topic_id: topicId,
  });
};

export const endStudySession = (sessionId: string) => {
  return api.post('/analytics/session/', {
    action: 'end',
    session_id: sessionId,
  });
};

export default api;
