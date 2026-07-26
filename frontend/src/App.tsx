import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RepositoryProvider } from './context/RepositoryContext';
import { setupAxiosInterceptors } from './hooks/useApi';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Workspace } from './pages/Workspace';
import { Analysis } from './pages/Analysis';
import { Chat } from './pages/Chat';
import { Reports } from './pages/Reports';
const AppContent: React.FC = () => {
  const { token, logout, isLoading } = useAuth();
  // Connect API interceptors to token expiries
  useEffect(() => {
    setupAxiosInterceptors(logout);
  }, [logout]);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={!token ? <Landing /> : <Navigate to="/workspace" />} />
      {/* Protected Routes */}
      <Route 
        path="/workspace" 
        element={
          token ? (
            <RepositoryProvider>
              <Layout>
                <Workspace />
              </Layout>
            </RepositoryProvider>
          ) : (
            <Navigate to="/" />
          )
        } 
      />
      <Route 
        path="/analysis" 
        element={
          token ? (
            <RepositoryProvider>
              <Layout>
                <Analysis />
              </Layout>
            </RepositoryProvider>
          ) : (
            <Navigate to="/" />
          )
        } 
      />
      <Route 
        path="/chat" 
        element={
          token ? (
            <RepositoryProvider>
              <Layout>
                <Chat />
              </Layout>
            </RepositoryProvider>
          ) : (
            <Navigate to="/" />
          )
        } 
      />
      <Route 
        path="/reports" 
        element={
          token ? (
            <RepositoryProvider>
              <Layout>
                <Reports />
              </Layout>
            </RepositoryProvider>
          ) : (
            <Navigate to="/" />
          )
        } 
      />
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};
export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};
export default App;