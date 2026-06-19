'use client';

import { buildURL, apiRequest } from './config';

const GRADES_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.klasaapp.com';

const buildGradesURL = (path) => `${GRADES_BASE}${path}`;

export const gradesAPI = {
  // ดึงเกรดของนักเรียนรายคน
  async getStudentGrades(studentCode, token) {
    const url = buildGradesURL(`/api/grades/student/${studentCode}`);
    return apiRequest(url, { token });
  },

  // ดึงเกรดของนักเรียนหลายคนพร้อมกัน → { data: { [student_code]: SubjectGrade[] } }
  async getGradesBatch(studentCodes, semester, academicYear, token) {
    if (!studentCodes.length) return {};
    const params = new URLSearchParams({ student_codes: studentCodes.join(',') });
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    const url = buildGradesURL(`/api/grades/batch?${params}`);
    const res = await apiRequest(url, { token });
    return res?.data || {};
  },

  // ดึงเกรดทั้งห้องตาม semester/year
  async getClassGrades(classId, semester, academicYear, token) {
    const params = new URLSearchParams({ semester, academic_year: academicYear });
    const url = buildGradesURL(`/api/grades/class/${classId}?${params}`);
    return apiRequest(url, { token });
  },

  // บันทึก/อัปเดตเกรดนักเรียน 1 คน 1 วิชา
  async upsertGrade(payload, token) {
    const url = buildGradesURL('/api/grades/entry');
    return apiRequest(url, { method: 'POST', body: payload, token });
  },

  // บันทึกเกรดหลายรายการพร้อมกัน
  async bulkUpsertGrades(entries, token) {
    const url = buildGradesURL('/api/grades/bulk');
    return apiRequest(url, { method: 'POST', body: { entries }, token });
  },

  // ดึงรายวิชาทั้งหมดของห้อง
  async getSubjectsByClass(classId, semester, academicYear, token) {
    const params = new URLSearchParams({ semester, academic_year: academicYear });
    const url = buildURL('SCHEDULE', `/api/v1/subjects/class/${classId}?${params}`);
    return apiRequest(url, { token });
  },

  // ดึงสถานะการเผยแพร่เกรด
  async getPublishStatus(semester, academicYear, token) {
    const params = new URLSearchParams({ semester, academic_year: academicYear });
    const url = buildGradesURL(`/api/grades/publish?${params}`);
    return apiRequest(url, { token });
  },

  // ตั้งค่าการเผยแพร่ (status: 'published' | 'scheduled' | 'draft')
  async setPublishSettings({ semester, academicYear, status, scheduledAt }, token) {
    const url = buildGradesURL('/api/grades/publish');
    const body = { semester: parseInt(semester, 10), academic_year: academicYear, status };
    if (scheduledAt) body.scheduled_at = scheduledAt;
    return apiRequest(url, { method: 'POST', body, token });
  },
};

export default gradesAPI;
