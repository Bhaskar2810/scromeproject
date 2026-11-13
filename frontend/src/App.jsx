import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RequestsListPage from './pages/RequestsListPage';
import CreateRequestPage from './pages/CreateRequestPage';
import RequestDetailsPage from './pages/RequestDetailsPage';
import DecisionExplanationPage from './pages/DecisionExplanationPage';
import ManualReviewPage from './pages/ManualReviewPage';
import WorkflowManagementPage from './pages/WorkflowManagementPage';
import RuleManagementPage from './pages/RuleManagementPage';
import AuditTrailPage from './pages/AuditTrailPage';
import SystemHealthPage from './pages/SystemHealthPage';
import ProfilePage from './pages/ProfilePage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold text-sm">
        Initializing Decision Platform...
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="requests" element={<RequestsListPage />} />
              <Route path="requests/new" element={<CreateRequestPage />} />
              <Route path="requests/:id" element={<RequestDetailsPage />} />
              <Route path="requests/:id/explanation" element={<DecisionExplanationPage />} />
              <Route path="reviews" element={<ManualReviewPage />} />
              <Route path="workflows" element={<WorkflowManagementPage />} />
              <Route path="rules" element={<RuleManagementPage />} />
              <Route path="audit" element={<AuditTrailPage />} />
              <Route path="system" element={<SystemHealthPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
