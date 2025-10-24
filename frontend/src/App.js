import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import StudyPage from './pages/StudyPage';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PDFViewerPage from './pages/PDFViewerPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar';
import { ThemeProvider } from './contexts/ThemeContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-slate-800 transition-colors duration-300">
          <Routes>
            {/* Landing Page - Public */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Auth Routes - Public */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Protected Routes */}
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <HomePage />
                  </>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/study" 
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <StudyPage />
                  </>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <ChatPage />
                  </>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <AnalyticsPage />
                  </>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pdf/:documentId" 
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <PDFViewerPage />
                  </>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
