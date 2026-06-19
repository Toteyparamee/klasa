'use client';

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, isInitialized } = useAuth();

  // รอให้โหลด sessionStorage เสร็จก่อน ป้องกัน redirect ไป login ก่อนเวลา
  if (!isInitialized) {
    return null; // หรือใส่ loading spinner ก็ได้
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
