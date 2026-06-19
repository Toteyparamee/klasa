'use client';

// Version API - จัดการ app version สำหรับ Flutter app
import { buildURL, apiRequest } from './config';

export const versionAPI = {
  // ดึง version ทั้งหมด (ทุก platform, รวม history)
  getAll: () =>
    apiRequest(buildURL('LOGIN', '/api/v1/admin/versions')),

  // อัปเดต (หรือสร้าง) version ของ platform
  // platform: 'ios' | 'android'
  upsert: (platform, data) =>
    apiRequest(buildURL('LOGIN', `/api/v1/admin/versions/${platform}`), {
      method: 'PUT',
      body: data,
    }),
};

export default { versionAPI };
