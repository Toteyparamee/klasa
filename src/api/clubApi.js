'use client';

// Club API - จัดการชุมนุม (สมาชิกถาวรทั้งปีการศึกษา อยู่ที่ club-service แยกต่างหาก)
import { buildURL, apiRequest } from './config';

export const clubAPI = {
  async getClubs(academicYear, token) {
    const params = academicYear ? `?academic_year=${academicYear}` : '';
    const url = buildURL('CLUB', `/api/club${params}`);
    return apiRequest(url, { token });
  },

  async getClub(id, token) {
    const url = buildURL('CLUB', `/api/club/${id}`);
    return apiRequest(url, { token });
  },

  async createClub(data, token) {
    const url = buildURL('CLUB', '/api/club');
    return apiRequest(url, { method: 'POST', body: data, token });
  },

  async updateClub(id, data, token) {
    const url = buildURL('CLUB', `/api/club/${id}`);
    return apiRequest(url, { method: 'PUT', body: data, token });
  },

  async deleteClub(id, token) {
    const url = buildURL('CLUB', `/api/club/${id}`);
    return apiRequest(url, { method: 'DELETE', token });
  },

  async getClubMembers(id, token) {
    const url = buildURL('CLUB', `/api/club/${id}/members`);
    return apiRequest(url, { token });
  },
};

export default clubAPI;
