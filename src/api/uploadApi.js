'use client';

import { buildURL, getToken } from './config';

const uploadBase = (path) => buildURL('UPLOAD', path);

export const uploadAPI = {
  async uploadSchoolLogo(schoolId, file) {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(uploadBase(`/api/upload/school-logo/${schoolId}`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'อัปโหลดไม่สำเร็จ');
    return data;
  },

  getSchoolLogoUrl(schoolId, bust = false) {
    const base = uploadBase(`/api/upload/school-logo/${schoolId}/latest`);
    return bust ? `${base}?t=${Date.now()}` : base;
  },
};
