'use client';

// School API - จัดการโรงเรียน
import { buildURL, apiRequest } from './config';

export const schoolAPI = {
  // Get all schools
  async getSchools(token) {
    const url = buildURL('PERSONNEL', '/api/v1/schools');
    return apiRequest(url, { token });
  },

  // Get school by ID
  async getSchool(id, token) {
    const url = buildURL('PERSONNEL', `/api/v1/schools/${id}`);
    return apiRequest(url, { token });
  },

  // Create school
  async createSchool(schoolData, token) {
    const url = buildURL('PERSONNEL', '/api/v1/schools');
    return apiRequest(url, {
      method: 'POST',
      body: schoolData,
      token,
    });
  },

  // Update school
  async updateSchool(id, schoolData, token) {
    const url = buildURL('PERSONNEL', `/api/v1/schools/${id}`);
    return apiRequest(url, {
      method: 'PUT',
      body: schoolData,
      token,
    });
  },

  // Delete school
  async deleteSchool(id, token) {
    const url = buildURL('PERSONNEL', `/api/v1/schools/${id}`);
    return apiRequest(url, {
      method: 'DELETE',
      token,
    });
  },
};

export default schoolAPI;
