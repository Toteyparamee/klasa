'use client';

// School Domain API - จัดการ mapping โดเมนอีเมล GAFE (Google Workspace for
// Education) → โรงเรียน สำหรับ Google Sign-In (ดู GAFE_LOGIN_DESIGN.md)
import { buildURL, apiRequest } from './config';

export const schoolDomainAPI = {
  // ดึงโดเมนทั้งหมด (ทุกโรงเรียน)
  getAll: () =>
    apiRequest(buildURL('LOGIN', '/api/v1/admin/school-domains')),

  // สร้าง mapping โดเมนใหม่
  create: (data) =>
    apiRequest(buildURL('LOGIN', '/api/v1/admin/school-domains'), {
      method: 'POST',
      body: data,
    }),

  // แก้ไข mapping ที่มีอยู่
  update: (id, data) =>
    apiRequest(buildURL('LOGIN', `/api/v1/admin/school-domains/${id}`), {
      method: 'PUT',
      body: data,
    }),

  // ลบ (soft delete) mapping
  remove: (id) =>
    apiRequest(buildURL('LOGIN', `/api/v1/admin/school-domains/${id}`), {
      method: 'DELETE',
    }),
};

export default { schoolDomainAPI };
