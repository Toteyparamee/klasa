'use client';

// Club API - จัดการชุมนุม (สมาชิกถาวรทั้งปีการศึกษา อยู่ที่ club-service แยกต่างหาก)
import { buildURL, apiRequest, getToken } from './config';

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

  async getScheduleConfig(token) {
    const url = buildURL('CLUB', '/api/club/schedule-config');
    return apiRequest(url, { token });
  },

  async updateScheduleConfig(data, token) {
    const url = buildURL('CLUB', '/api/club/schedule-config');
    return apiRequest(url, { method: 'PUT', body: data, token });
  },

  // อัปโหลดรูปปกชุมนุมไป MinIO ผ่าน club-service — คืน { url, key }
  async uploadImage(file, token) {
    const authToken = token || getToken();
    const formData = new FormData();
    formData.append('file', file);

    const url = buildURL('CLUB', '/api/club/upload');
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to upload image');
    }
    return data.data || data;
  },

  // แปลง relative URL (/api/club/files/...) → absolute URL พร้อม host
  resolveImageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = buildURL('CLUB', '');
    return `${base}${path}`;
  },
};

export default clubAPI;
