import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SchoolProvider } from './context/SchoolContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './views/Login';
import ResetPassword from './views/ResetPassword';
import AdminDashboard from './views/AdminDashboard';
import SchoolDetail from './views/SchoolDetail';
import PersonnelManagementPage from './views/PersonnelManagementPage';
import UserManagementPage from './views/UserManagementPage';
import SystemSettingsPage from './views/SystemSettingsPage';
import BehaviorScorePage from './views/BehaviorScorePage';
import NewsManagementPage from './views/NewsManagementPage';
import EmergencyDashboard from './views/EmergencyDashboard';
import AcademicReportPage from './views/AcademicReportPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <SchoolProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/school/:schoolId"
              element={
                <ProtectedRoute>
                  <SchoolDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/personnel"
              element={
                <ProtectedRoute>
                  <PersonnelManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/behavior"
              element={
                <ProtectedRoute>
                  <BehaviorScorePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news"
              element={
                <ProtectedRoute>
                  <NewsManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emergency"
              element={
                <ProtectedRoute>
                  <EmergencyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic-report"
              element={
                <ProtectedRoute>
                  <AcademicReportPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SchoolProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
