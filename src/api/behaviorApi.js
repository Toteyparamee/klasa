'use client';

// Behavior API - จัดการคะแนนพฤติกรรมนักเรียน
import { buildURL, apiRequest } from './config';

// Category (รายการตัดคะแนน) API
export const categoryAPI = {
  // ดึงรายการตัดคะแนนทั้งหมด
  async getCategories(token, activeOnly = true) {
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/categories?active_only=${activeOnly}`);
    return apiRequest(url, { token });
  },

  // เพิ่มรายการตัดคะแนนใหม่
  async createCategory(data, token) {
    const url = buildURL('BEHAVIOR', '/api/v1/behavior/categories');
    return apiRequest(url, { method: 'POST', body: data, token });
  },

  // แก้ไขรายการตัดคะแนน
  async updateCategory(id, data, token) {
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/categories/${id}`);
    return apiRequest(url, { method: 'PUT', body: data, token });
  },

  // ลบรายการตัดคะแนน
  async deleteCategory(id, token) {
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/categories/${id}`);
    return apiRequest(url, { method: 'DELETE', token });
  },
};

// Behavior (คะแนนพฤติกรรม) API
export const behaviorAPI = {
  // ดึงนักเรียนทั้งหมดพร้อมคะแนน
  async getAllStudents(token, semester, academicYear, schoolId) {
    const params = new URLSearchParams();
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    if (schoolId) params.append('school_id', schoolId);
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/all-students?${params}`);
    return apiRequest(url, { token });
  },

  // ดึงนักเรียนตามห้อง
  async getStudentsByClass(classId, token, semester, academicYear, schoolId) {
    const params = new URLSearchParams({ class_id: classId });
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    if (schoolId) params.append('school_id', schoolId);
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/students?${params}`);
    return apiRequest(url, { token });
  },

  // ดึงรายละเอียดคะแนนนักเรียนคนเดียว
  async getStudentDetail(studentId, token, semester, academicYear) {
    const params = new URLSearchParams();
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/students/${studentId}?${params}`);
    return apiRequest(url, { token });
  },

  // บันทึกการตัดคะแนน
  async createRecord(data, token, semester, academicYear) {
    const params = new URLSearchParams();
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/records?${params}`);
    return apiRequest(url, { method: 'POST', body: data, token });
  },

  // ดึงรายการบันทึกการตัดคะแนน
  async getRecords(token, filters = {}) {
    const params = new URLSearchParams();
    if (filters.studentId) params.append('student_code', filters.studentId);
    if (filters.semester) params.append('semester', filters.semester);
    if (filters.academicYear) params.append('academic_year', filters.academicYear);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/records?${params}`);
    return apiRequest(url, { token });
  },

  // ลบบันทึกการตัดคะแนน
  async deleteRecord(id, token) {
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/records/${id}`);
    return apiRequest(url, { method: 'DELETE', token });
  },

  // สรุปภาพรวม
  async getSummary(token, semester, academicYear) {
    const params = new URLSearchParams();
    if (semester) params.append('semester', semester);
    if (academicYear) params.append('academic_year', academicYear);
    const url = buildURL('BEHAVIOR', `/api/v1/behavior/summary?${params}`);
    return apiRequest(url, { token });
  },
};

export default { categoryAPI, behaviorAPI };
