import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import FloorWardenDashboard from './pages/FloorWardenDashboard';
import MainWardenDashboard from './pages/MainWardenDashboard';
import LandingPage from './pages/LandingPage';
import NightWardenDashboard from './pages/NightWardenDashboard';
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/floor-warden" element={
          <ProtectedRoute allowedRoles={['floor_warden']}>
            <FloorWardenDashboard />
          </ProtectedRoute>
        } />
        <Route path="/main-warden" element={
          <ProtectedRoute allowedRoles={['main_warden']}>
            <MainWardenDashboard />
          </ProtectedRoute>
        } />
        <Route path="/night-warden" element={
          <ProtectedRoute allowedRoles={['night_warden']}>
            <NightWardenDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
