import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Colors for pie chart
const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const AnalyticsPage = () => {
  const [insights, setInsights] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setRefreshing(true);
    try {
      // Fetch analytics insights
      const insightsResponse = await api.get('/analytics/insights/');
      console.log('📊 Insights:', insightsResponse.data);
      setInsights(insightsResponse.data);

      // Fetch user documents for real subject distribution
      const docsResponse = await api.get('/reader/documents');
      console.log('📚 Documents:', docsResponse.data.documents?.length || 0);
      setDocuments(docsResponse.data.documents || []);
      
      // Fetch progress data for weekly charts
      const progressResponse = await api.get('/analytics/progress/');
      console.log('📈 Progress data:', progressResponse.data);
      console.log('📈 Progress array:', JSON.stringify(progressResponse.data.progress, null, 2));
      setProgressData(progressResponse.data.progress || []);
      
      // Fetch study sessions for pie chart
      const sessionsResponse = await api.get('/analytics/sessions/');
      console.log('📚 Sessions data:', sessionsResponse.data);
      setSessions(sessionsResponse.data.sessions || []);
      
      setError(null);
    } catch (error) {
      setError('Failed to load analytics data');
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Calculate document distribution based on actual study time
  const getDocumentDistribution = () => {
    console.log('🔍 Sessions:', sessions?.length, sessions);
    console.log('🔍 Documents:', documents?.length, documents);
    
    if (!sessions || sessions.length === 0 || !documents || documents.length === 0) {
      return [];
    }

    // Group sessions by document_id and sum study time
    const timeByDocument = {};
    
    sessions.forEach((session) => {
      const docId = session.document_id;
      if (docId) {  // Only process if document_id exists
        if (!timeByDocument[docId]) {
          timeByDocument[docId] = 0;
        }
        timeByDocument[docId] += session.duration_minutes || 0;
      }
    });

    console.log('📊 Time by document:', timeByDocument);

    // Map document IDs to names and calculate percentages
    const distribution = [];
    const totalTime = Object.values(timeByDocument).reduce((sum, time) => sum + time, 0);
    
    Object.entries(timeByDocument).forEach(([docId, time]) => {
      // Try both string and number comparison
      const doc = documents.find(d => d.id === docId || d.id === parseInt(docId) || String(d.id) === docId);
      console.log('🔎 Looking for doc:', docId, 'Found:', doc?.title);
      
      if (doc) {
        const percentage = totalTime > 0 ? Math.round((time / totalTime) * 100) : 0;
        distribution.push({
          name: doc.title,
          value: percentage,
          studyTime: time,
          fill: COLORS[distribution.length % COLORS.length],
        });
      }
    });

    console.log('📈 Final distribution:', distribution);
    return distribution;
  };  // Generate realistic weekly data from actual study sessions
  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // If no progress data, show empty week
    if (!progressData || progressData.length === 0) {
      console.log('⚠️ No progress data available');
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, time: 0, sessions: 0 }));
    }

    console.log('📊 Building weekly data from progress:', progressData);

    // Get last 7 days and build data for each
    const today = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = days[date.getDay()]; // 0=Sun, 1=Mon, ..., 6=Sat
      
      // Find matching progress data for this date
      const progressForDate = progressData.find(item => item.date === dateStr);
      
      weekData.push({
        day: dayOfWeek,
        date: dateStr,
        time: progressForDate ? progressForDate.duration_minutes : 0, // Keep as minutes
        sessions: progressForDate ? (progressForDate.documents_count || 1) : 0
      });
    }
    
    // Sort by day of week (Mon-Sun)
    const dayOrder = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    weekData.sort((a, b) => dayOrder[a.day] - dayOrder[b.day]);
    
    console.log('📈 Final weekly data:', weekData);
    return weekData;
  };

  const weeklyData = getWeeklyData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-indigo-200 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-purple-400 rounded-full animate-spin animate-reverse mx-auto"></div>
            </div>
            <p className="text-xl font-medium text-gray-700 dark:text-gray-300 animate-pulse">Loading your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-500">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl">
            <div className="relative mb-8">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-200/50 to-red-300/50 dark:from-red-900/50 dark:to-red-800/50 rounded-3xl blur-xl"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Unable to Load Analytics</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">{error}</p>
            <button
              onClick={loadAnalytics}
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white font-semibold rounded-2xl hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-700 dark:hover:to-purple-800 transition-all duration-300 hover:scale-105 shadow-xl text-lg"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const documentStats = getDocumentDistribution();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-500">
      <Navbar />
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden mb-12">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl p-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-105 transition-all duration-300">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-8">
                  <h1 className="text-5xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">Analytics Dashboard</h1>
                  <p className="text-2xl text-gray-600 dark:text-gray-400 font-medium">Track your learning progress and insights</p>
                </div>
              </div>
              <button
                onClick={loadAnalytics}
                disabled={refreshing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
                {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Documents</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {documents?.length || 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Study Time</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {insights?.total_study_time 
                    ? insights.total_study_time >= 60 
                      ? `${Math.floor(insights.total_study_time / 60)}h ${insights.total_study_time % 60}m`
                      : `${insights.total_study_time}m`
                    : '0m'
                  }
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Study Sessions</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {sessions?.length || 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Weekly Study Time */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full blur-3xl"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 px-8 py-6">
                <div className="flex items-center">
                  <div className="relative group/icon">
                    <div className="absolute -inset-1 bg-white/20 rounded-xl blur"></div>
                    <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">Weekly Study Time</h3>
                </div>
              </div>
              <div className="relative p-8">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis 
                      stroke="#6b7280"
                      tickFormatter={(value) => `${Math.round(value)}m`}
                    />
                    <Tooltip 
                      formatter={(value) => {
                        // value is already in minutes
                        return [formatTime(value), 'Study Time'];
                      }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    <Bar dataKey="time" fill="url(#blueGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#1D4ED8" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Study Sessions */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-full blur-3xl"></div>
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 px-8 py-6">
                <div className="flex items-center">
                  <div className="relative group/icon">
                    <div className="absolute -inset-1 bg-white/20 rounded-xl blur"></div>
                    <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">Documents Studied Daily</h3>
                  <p className="text-sm text-white/80 mt-1">Number of unique documents per day</p>
                </div>
              </div>
              <div className="relative p-8">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="#10B981" 
                      strokeWidth={4}
                      dot={{ fill: '#10B981', strokeWidth: 3, r: 8 }}
                      activeDot={{ r: 10, fill: '#059669', stroke: '#ffffff', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Distribution & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full blur-3xl"></div>
              <div className="relative bg-gradient-to-r from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 px-8 py-6">
                <div className="flex items-center">
                  <div className="relative group/icon">
                    <div className="absolute -inset-1 bg-white/20 rounded-xl blur"></div>
                    <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">Study Distribution by Subject</h3>
                </div>
              </div>
              <div className="relative p-8">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={documentStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name} ${value}%`}
                      labelLine={false}
                    >
                      {documentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => {
                        const studyTime = props.payload.studyTime || 0;
                        return [
                          `${value}% (${studyTime} min${studyTime !== 1 ? 's' : ''})`,
                          'Study Time'
                        ];
                      }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-red-600/10 rounded-full blur-3xl"></div>
              <div className="relative bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700 px-8 py-6">
                <div className="flex items-center">
                  <div className="relative group/icon">
                    <div className="absolute -inset-1 bg-white/20 rounded-xl blur"></div>
                    <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">Recent Activity</h3>
                </div>
              </div>
              <div className="relative p-8">
                <div className="space-y-6">
                  {documents && documents.length > 0 ? (
                    documents.slice(0, 3).map((doc, index) => {
                      const colors = [
                        { from: 'purple-500', to: 'pink-600', bg: 'purple-50/80 to-pink-50/80', darkBg: 'purple-900/20 to-pink-900/20', border: 'purple-200/30', darkBorder: 'purple-700/30' },
                        { from: 'blue-500', to: 'indigo-600', bg: 'blue-50/80 to-indigo-50/80', darkBg: 'blue-900/20 to-indigo-900/20', border: 'blue-200/30', darkBorder: 'blue-700/30' },
                        { from: 'green-500', to: 'emerald-600', bg: 'green-50/80 to-emerald-50/80', darkBg: 'green-900/20 to-emerald-900/20', border: 'green-200/30', darkBorder: 'green-700/30' }
                      ];
                      const color = colors[index % colors.length];
                      
                      const getTimeAgo = (dateString) => {
                        if (!dateString) return 'Recently';
                        const date = new Date(dateString);
                        const now = new Date();
                        const diffMs = now - date;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);
                        
                        if (diffMins < 60) return `${diffMins} minutes ago`;
                        if (diffHours < 24) return `${diffHours} hours ago`;
                        if (diffDays === 1) return 'Yesterday';
                        if (diffDays < 7) return `${diffDays} days ago`;
                        return date.toLocaleDateString();
                      };
                      
                      return (
                        <div key={doc.id} className="group/activity relative">
                          <div className={`absolute -inset-1 bg-gradient-to-r from-${color.from}/20 to-${color.to}/20 rounded-2xl blur opacity-0 group-hover/activity:opacity-100 transition duration-300`}></div>
                          <div className={`relative flex items-center space-x-6 p-6 bg-gradient-to-r from-${color.bg} dark:from-${color.darkBg} backdrop-blur-sm rounded-2xl border border-${color.border} dark:border-${color.darkBorder} hover:scale-105 transition-all duration-300`}>
                            <div className="relative group/icon">
                              <div className={`absolute -inset-1 bg-gradient-to-r from-${color.from} to-${color.to} rounded-xl blur opacity-30`}></div>
                              <div className={`relative w-12 h-12 bg-gradient-to-br from-${color.from} to-${color.to} dark:from-${color.from.replace('500', '600')} dark:to-${color.to.replace('600', '700')} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 dark:text-gray-100 text-lg truncate">
                                {doc.title || 'Untitled Document'}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400 flex items-center mt-2 font-medium">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {getTimeAgo(doc.uploaded_at || doc.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No recent activity</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Upload documents to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AnalyticsPage;
