import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Sidebar from './components/Shared/Sidebar';
import Navbar from './components/Shared/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import DashboardPage from './pages/DashboardPage';
import ReviewPage from './pages/ReviewPage';
import RepositoriesPage from './pages/RepositoriesPage';
import ImpactRadarPage from './pages/ImpactRadarPage';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import WorkspacePage from './pages/WorkspacePage';
import SettingsPage from './pages/SettingsPage';
import { SkillGrowthPage } from './pages/SkillGrowthPage';
import { TimeMachinePage } from './pages/TimeMachinePage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { Toaster } from 'react-hot-toast';

// High-Order Component to protect private dashboard routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token } = useAuthStore();
  const storedToken = localStorage.getItem('codelens_token');
  
  if (!isAuthenticated && !storedToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Global Layout wrapper for authorized routes
const DashboardLayout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-0 text-text-1 font-body">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-grow overflow-y-auto bg-bg-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  const { fetchMe, token } = useAuthStore();

  useEffect(() => {
    const localToken = localStorage.getItem('codelens_token');
    if (localToken) {
      fetchMe();
    }
  }, [fetchMe, token]);

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#161b22',
            color: '#e6edf3',
            border: '1px solid #30363d'
          }
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/review" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ReviewPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/repositories" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RepositoriesPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/impact-radar" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ImpactRadarPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <HistoryPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <WorkspacePage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/skill-growth" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SkillGrowthPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/time-machine" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TimeMachinePage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/knowledge-base" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <KnowledgeBasePage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/leaderboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LeaderboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
