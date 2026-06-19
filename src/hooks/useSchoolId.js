'use client';

import { useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { SchoolContext } from '../context/SchoolContext';
import { API_CONFIG } from '../api/config';

// คืน school_id ที่ใช้งานอยู่
// - admin: ใช้ selectedSchoolId ที่เลือกจาก dropdown (ถ้ายังไม่เลือกจะเป็น null)
// - editor/viewer: ใช้ school_id จาก JWT token
export const useSchoolId = () => {
  const { user } = useAuth();
  const schoolCtx = useContext(SchoolContext);

  if (user?.role === 'admin') {
    return schoolCtx?.selectedSchoolId ?? user?.school_id ?? null;
  }

  return user?.school_id ?? API_CONFIG.DEFAULT_SCHOOL_ID;
};
