'use client';

import { AuthProvider } from '../context/AuthContext';
import { SchoolProvider } from '../context/SchoolContext';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <SchoolProvider>{children}</SchoolProvider>
    </AuthProvider>
  );
}
