'use client';

// Schedule API - จัดการตารางสอน, รายวิชา
import { buildURL, apiRequest, API_CONFIG, getHeaders, getToken } from './config';

// Subject API
export const subjectAPI = {
  // Get all subjects (by school)
  async getSubjects(schoolId = API_CONFIG.DEFAULT_SCHOOL_ID, token) {
    const url = buildURL('SCHEDULE', `/api/v1/subjects/school/${schoolId}`);
    return apiRequest(url, { token });
  },

  // Get subjects by teacher code
  async getSubjectsByTeacher(teacherCode, token) {
    const url = buildURL('SCHEDULE', `/api/v1/subjects/teacher/${teacherCode}`);
    return apiRequest(url, { token });
  },

  // Get subject by ID
  async getSubjectById(id, token) {
    const url = buildURL('SCHEDULE', `/api/v1/subjects/${id}`);
    return apiRequest(url, { token });
  },

  // Create subject
  async createSubject(subjectData, token) {
    const url = buildURL('SCHEDULE', '/api/v1/subjects');
    return apiRequest(url, {
      method: 'POST',
      body: subjectData,
      token,
    });
  },

  // Update subject
  async updateSubject(id, subjectData, token) {
    const url = buildURL('SCHEDULE', `/api/v1/subjects/${id}`);
    return apiRequest(url, {
      method: 'PUT',
      body: subjectData,
      token,
    });
  },

  // Delete subject
  async deleteSubject(id, token) {
    const url = buildURL('SCHEDULE', `/api/v1/subjects/${id}`);
    return apiRequest(url, {
      method: 'DELETE',
      token,
    });
  },
};

// Schedule API
export const scheduleAPI = {
  // Get all schedules
  async getSchedules(params = {}, token) {
    const {
      schoolId = API_CONFIG.DEFAULT_SCHOOL_ID,
      semester = API_CONFIG.DEFAULT_SEMESTER,
      academicYear = API_CONFIG.DEFAULT_ACADEMIC_YEAR,
    } = params;

    const url = buildURL('SCHEDULE', `/api/v1/schedules?school_id=${schoolId}&semester=${semester}&academic_year=${academicYear}`);
    return apiRequest(url, { token });
  },

  // Get schedules by class ID (ดึงวิชาที่ห้องนั้นเรียน)
  async getSchedulesByClass(classId, params = {}, token) {
    const { semester, academicYear } = params;
    const q = new URLSearchParams();
    if (semester) q.append('semester', semester);
    if (academicYear) q.append('academic_year', academicYear);
    const url = buildURL('SCHEDULE', `/api/v1/schedules/class/${classId}?${q}`);
    return apiRequest(url, { token });
  },

  // Get schedules by teacher code
  async getSchedulesByTeacher(teacherCode, params = {}, token) {
    const {
      semester = API_CONFIG.DEFAULT_SEMESTER,
      academicYear = API_CONFIG.DEFAULT_ACADEMIC_YEAR,
    } = params;

    const url = buildURL('SCHEDULE', `/api/v1/schedules/teacher/${teacherCode}?semester=${semester}&academic_year=${academicYear}`);
    return apiRequest(url, { token });
  },

  // Get schedules by subject ID
  async getSchedulesBySubject(subjectId, params = {}, token) {
    const { semester, academicYear } = params;

    let url = buildURL('SCHEDULE', `/api/v1/schedules/subject/${subjectId}`);
    const queryParams = [];
    if (semester) queryParams.push(`semester=${semester}`);
    if (academicYear) queryParams.push(`academic_year=${academicYear}`);
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    return apiRequest(url, { token });
  },

  // Create schedule
  async createSchedule(scheduleData, token) {
    const url = buildURL('SCHEDULE', '/api/v1/schedules');
    return apiRequest(url, {
      method: 'POST',
      body: scheduleData,
      token,
    });
  },

  // Update schedule
  async updateSchedule(id, scheduleData, token) {
    const url = buildURL('SCHEDULE', `/api/v1/schedules/${id}`);
    return apiRequest(url, {
      method: 'PUT',
      body: scheduleData,
      token,
    });
  },

  // Delete schedule
  async deleteSchedule(id, token) {
    const url = buildURL('SCHEDULE', `/api/v1/schedules/${id}`);
    return apiRequest(url, {
      method: 'DELETE',
      token,
    });
  },
};

// Class API (for schedule management)
export const scheduleClassAPI = {
  // Get all classes
  async getClasses(schoolId = API_CONFIG.DEFAULT_SCHOOL_ID, token) {
    const url = buildURL('SCHEDULE', `/api/v1/classes?school_id=${schoolId}`);
    return apiRequest(url, { token });
  },
};

// Period Grid Config API
export const periodGridAPI = {
  async getConfig(schoolId = API_CONFIG.DEFAULT_SCHOOL_ID, token) {
    const url = buildURL('SCHEDULE', `/api/v1/period-grid-config?school_id=${schoolId}`);
    return apiRequest(url, { token });
  },

  async saveConfig(slots, schoolId = API_CONFIG.DEFAULT_SCHOOL_ID, token) {
    const url = buildURL('SCHEDULE', '/api/v1/period-grid-config');
    const normalizedSlots = slots.map(({ isBreak, ...s }) => ({ ...s, is_break: isBreak }));
    return apiRequest(url, {
      method: 'POST',
      body: { school_id: Number(schoolId), slots: normalizedSlots },
      token,
    });
  },
};

export default {
  subjectAPI,
  scheduleAPI,
  scheduleClassAPI,
  periodGridAPI,
};
