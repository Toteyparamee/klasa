'use client';

// Academic Report API - รายงานวิชาการ (ข้อมูลการเข้าเรียน)
import { buildURL, apiRequest, API_CONFIG } from './config';

const ATTENDANCE_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.klasaapp.com';

const buildAttendanceURL = (path) => `${ATTENDANCE_BASE}${path}`;

export const academicAPI = {
  // ดึงนักเรียนทั้งหมด (จาก personnel service)
  async getStudents(token) {
    const url = buildURL('PERSONNEL', '/api/v1/students');
    return apiRequest(url, { token });
  },

  // ดึงห้องเรียนทั้งหมด
  async getClasses(token, schoolId = API_CONFIG.DEFAULT_SCHOOL_ID) {
    const url = buildURL('PERSONNEL', `/api/v1/classes?school_id=${schoolId}`);
    return apiRequest(url, { token });
  },

  // ดึงข้อมูลการเข้าเรียนของนักเรียน (attendance service)
  async getStudentAttendance(studentCode, token) {
    const url = buildAttendanceURL(`/api/student/attendance?student_id=${studentCode}`);
    return apiRequest(url, { token });
  },

  // ดึง attendance_rate สรุปของนักเรียนหลายคนในครั้งเดียว (batch endpoint)
  async getAllStudentsAttendance(studentCodes, token) {
    if (!studentCodes.length) return {};
    const url = buildAttendanceURL(`/api/student/attendance/batch?student_ids=${studentCodes.join(',')}`);
    try {
      const res = await apiRequest(url, { token });
      return res?.data || {};
    } catch {
      return {};
    }
  },

  // ดึงคะแนนพฤติกรรมนักเรียนทั้งหมด
  async getBehaviorSummary(token, semester, academicYear) {
    const params = new URLSearchParams();
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/all-students?${params}`);
    return apiRequest(url, { token });
  },

  // ดึงข้อมูลการเข้าเรียนของครู (สำหรับ report ห้อง)
  async getTeacherAttendance(teacherId, token) {
    const url = buildAttendanceURL(`/api/teacher/attendance?teacher_id=${teacherId}`);
    return apiRequest(url, { token });
  },

  // ดึงนักเรียนในห้อง
  async getStudentsByClass(classId, token) {
    const url = buildURL('PERSONNEL', `/api/v1/students?class_id=${classId}`);
    return apiRequest(url, { token });
  },
};

export default academicAPI;
