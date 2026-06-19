'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function ProtectedPage({ children }) {
  const { user, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized) return null;
  if (!user) return null;

  return children;
}
