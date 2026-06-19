'use client';

// Settings API - จัดการการตั้งค่าระบบ (เทอมการศึกษา)
import { API_CONFIG, buildURL, apiRequest, getToken } from './config';

// ดึงการตั้งค่าเทอมทั้งหมด
export const getSemesterSettings = async (schoolId = API_CONFIG.DEFAULT_SCHOOL_ID, academicYear = null) => {
  let url = buildURL('SCHEDULE', `/api/v1/semesters?school_id=${schoolId}`);
  if (academicYear) {
    url += `&academic_year=${academicYear}`;
  }
  return apiRequest(url);
};

// ดึงเทอมปัจจุบัน
export const getCurrentSemester = async (schoolId = API_CONFIG.DEFAULT_SCHOOL_ID) => {
  const url = buildURL('SCHEDULE', `/api/v1/semesters/current?school_id=${schoolId}`);
  return apiRequest(url);
};

// สร้างการตั้งค่าเทอมใหม่
export const createSemesterSetting = async (data) => {
  const url = buildURL('SCHEDULE', '/api/v1/semesters');
  return apiRequest(url, {
    method: 'POST',
    body: data,
  });
};

// อัปเดตการตั้งค่าเทอม
export const updateSemesterSetting = async (id, data) => {
  const url = buildURL('SCHEDULE', `/api/v1/semesters/${id}`);
  return apiRequest(url, {
    method: 'PUT',
    body: data,
  });
};

// ลบการตั้งค่าเทอม
export const deleteSemesterSetting = async (id) => {
  const url = buildURL('SCHEDULE', `/api/v1/semesters/${id}`);
  return apiRequest(url, {
    method: 'DELETE',
  });
};

// ตั้งเป็นเทอมปัจจุบัน
export const setCurrentSemester = async (id) => {
  const url = buildURL('SCHEDULE', `/api/v1/semesters/${id}/set-current`);
  return apiRequest(url, {
    method: 'POST',
  });
};

export default {
  getSemesterSettings,
  getCurrentSemester,
  createSemesterSetting,
  updateSemesterSetting,
  deleteSemesterSetting,
  setCurrentSemester,
};
