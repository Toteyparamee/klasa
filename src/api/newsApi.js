'use client';

// News API - จัดการข่าวสารและประกาศ
import { buildURL, apiRequest, getToken } from './config';

export const newsAPI = {
  async getNews(token, schoolId) {
    const params = schoolId ? `?school_id=${schoolId}` : '';
    const url = buildURL('NEWS', `/api/news${params}`);
    return apiRequest(url, { token });
  },

  async getNewsById(id, token) {
    const url = buildURL('NEWS', `/api/news/${id}`);
    return apiRequest(url, { token });
  },

  async createNews(data, token, schoolId) {
    const url = buildURL('NEWS', '/api/news');
    return apiRequest(url, { method: 'POST', body: { ...data, school_id: schoolId }, token });
  },

  async updateNews(id, data, token) {
    const url = buildURL('NEWS', `/api/news/${id}`);
    return apiRequest(url, { method: 'PUT', body: data, token });
  },

  async deleteNews(id, token) {
    const url = buildURL('NEWS', `/api/news/${id}`);
    return apiRequest(url, { method: 'DELETE', token });
  },

  // อัปโหลดรูปไป MinIO ผ่าน news-service — คืน { url, key }
  async uploadImage(file, token) {
    const authToken = token || getToken();
    const formData = new FormData();
    formData.append('file', file);

    const url = buildURL('NEWS', '/api/news/upload');
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

  // แปลง relative URL (/api/news/files/...) → absolute URL พร้อม host
  resolveImageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = buildURL('NEWS', '');
    return `${base}${path}`;
  },
};

export default newsAPI;
