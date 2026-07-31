'use client';

// Attendance API - ดึงข้อมูลการเช็คชื่อสำหรับ web control
import { buildURL, apiRequest } from './config';

export const attendanceAPI = {
  // นักเรียนที่อัตราการมาเรียนเดือนนี้ต่ำกว่าเกณฑ์ — สำหรับหน้าผู้บริหาร
  async getAtRiskAttendance(schoolId, threshold, token) {
    const params = new URLSearchParams({ school_id: schoolId });
    if (threshold) params.append('threshold', threshold);
    const url = buildURL('ATTENDANCE', `/api/executive/attendance/at-risk?${params}`);
    const res = await apiRequest(url, { token });
    return res?.data || [];
  },
};

export default attendanceAPI;
