'use client';

// Personnel API - จัดการบุคลากร, นักเรียน, ครู
import { buildURL, apiRequest, getHeaders, getToken } from './config';

// Student API
export const studentAPI = {
  // Get all students (page 1, default limit 20)
  async getStudents(token) {
    const url = buildURL('PERSONNEL', '/api/v1/students');
    return apiRequest(url, { token });
  },

  // Get all students with large limit (สำหรับ report ที่ต้องการทุกคน)
  async getStudentsAll(token, limit = 1000) {
    const url = buildURL('PERSONNEL', `/api/v1/students?limit=${limit}&page=1`);
    return apiRequest(url, { token });
  },

  // Create student
  async createStudent(studentData, token) {
    const url = buildURL('PERSONNEL', '/api/v1/students');
    return apiRequest(url, {
      method: 'POST',
      body: studentData,
      token,
    });
  },

  // Update student (admin/editor) - ส่ง partial fields ได้
  async updateStudent(id, data, token) {
    const url = buildURL('PERSONNEL', `/api/v1/students/${id}`);
    return apiRequest(url, {
      method: 'PUT',
      body: data,
      token,
    });
  },

  // Get student by numeric DB ID
  async getStudent(id, token) {
    const url = buildURL('PERSONNEL', `/api/v1/students/${id}`);
    return apiRequest(url, { token });
  },

  // Get student by student_code (preferred — stable identifier)
  async getStudentByCode(studentCode, token) {
    const url = buildURL('PERSONNEL', `/api/v1/students/by-code/${studentCode}`);
    return apiRequest(url, { token });
  },

  // Delete student
  async deleteStudent(id, token) {
    const url = buildURL('PERSONNEL', `/api/v1/students/${id}`);
    return apiRequest(url, {
      method: 'DELETE',
      token,
    });
  },

  // Upload students file (batch upload)
  async uploadStudentsFile(file, schoolId, token, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('school_id', schoolId);

    const url = buildURL('PERSONNEL', '/api/v1/students/upload');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.message || data.error || 'Failed to upload students file'));
          }
        } catch (err) {
          reject(new Error('Failed to parse server response'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },
};

// Teacher API
export const teacherAPI = {
  // Get all teachers
  async getTeachers(token, schoolId) {
    const url = buildURL('PERSONNEL', `/api/v1/teachers${schoolId ? `?school_id=${schoolId}` : ''}`);
    return apiRequest(url, { token });
  },

  // Create teacher
  async createTeacher(teacherData, token) {
    const url = buildURL('PERSONNEL', '/api/v1/teachers');
    return apiRequest(url, {
      method: 'POST',
      body: teacherData,
      token,
    });
  },

  // Update teacher
  async updateTeacher(id, teacherData, token) {
    const url = buildURL('PERSONNEL', `/api/v1/teachers/${id}`);
    return apiRequest(url, {
      method: 'PUT',
      body: teacherData,
      token,
    });
  },

  // Delete teacher
  async deleteTeacher(id, token) {
    const url = buildURL('PERSONNEL', `/api/v1/teachers/${id}`);
    return apiRequest(url, {
      method: 'DELETE',
      token,
    });
  },
};

// Personnel (General) API
export const personnelAPI = {
  // Get all personnel
  async getPersonnel(token) {
    const url = buildURL('PERSONNEL', '/api/personnel');
    return apiRequest(url, { token });
  },

  // Get personnel by ID
  async getPersonnelById(id, token) {
    const url = buildURL('PERSONNEL', `/api/personnel/${id}`);
    return apiRequest(url, { token });
  },

  // Create personnel
  async createPersonnel(personnelData, token) {
    const url = buildURL('PERSONNEL', '/api/personnel');
    return apiRequest(url, {
      method: 'POST',
      body: personnelData,
      token,
    });
  },

  // Update personnel
  async updatePersonnel(id, personnelData, token) {
    const url = buildURL('PERSONNEL', `/api/personnel/${id}`);
    return apiRequest(url, {
      method: 'PUT',
      body: personnelData,
      token,
    });
  },

  // Delete personnel
  async deletePersonnel(id, token) {
    const url = buildURL('PERSONNEL', `/api/personnel/${id}`);
    return apiRequest(url, {
      method: 'DELETE',
      token,
    });
  },
};

// Class API
export const classAPI = {
  // Get all classes
  async getClasses(token, schoolId) {
    const url = buildURL('PERSONNEL', `/api/v1/classes${schoolId ? `?school_id=${schoolId}` : ''}`);
    return apiRequest(url, { token });
  },

  // Get class students
  async getClassStudents(classId, token) {
    const url = buildURL('PERSONNEL', `/api/v1/classes/${classId}/students`);
    return apiRequest(url, { token });
  },

  // Delete class
  async deleteClass(classId, token) {
    const url = buildURL('PERSONNEL', `/api/v1/classes/${classId}`);
    return apiRequest(url, { method: 'DELETE', token });
  },
};

export default {
  studentAPI,
  teacherAPI,
  personnelAPI,
  classAPI,
};
