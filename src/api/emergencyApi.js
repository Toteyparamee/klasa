'use client';

// emergencyApi — wrapper สำหรับ emergency_api endpoints
//
// ใช้ Kong Gateway URL เดียวกับ service อื่น
// WebSocket auth ผ่าน ?token= query param (browser ตั้ง custom header ใน WS ไม่ได้)

import { apiRequest, API_CONFIG, getToken } from './config';

const BASE = API_CONFIG.BASE_URLS.LOGIN; // Kong gateway → routes /api/emergency/* ไป emergency-service

export const emergencyAPI = {
  /** เช็ค active alert ของโรงเรียน (poll ทุก 30s ฝั่ง admin) */
  getActive: () => apiRequest(`${BASE}/api/emergency/active`),

  /** trigger — ใช้สำหรับครู/รปภ./admin (web admin ก็ trigger ได้) */
  trigger: (alertType, note, lat = null, lng = null) =>
    apiRequest(`${BASE}/api/emergency/alert`, {
      method: 'POST',
      body: { alert_type: alertType, note, trigger_lat: lat, trigger_lng: lng },
    }),

  /** ปลดเหตุ (staff/admin only) */
  resolve: (alertId, resolutionNote = '', falseAlarm = false) =>
    apiRequest(`${BASE}/api/emergency/${alertId}/resolve`, {
      method: 'POST',
      body: { resolution_note: resolutionNote, false_alarm: falseAlarm },
    }),

  /** snapshot ตำแหน่งล่าสุด (รอบแรกก่อน connect WS) */
  snapshot: (alertId) =>
    apiRequest(`${BASE}/api/emergency/${alertId}/map`),

  /** history เหตุที่ผ่านมา */
  history: () => apiRequest(`${BASE}/api/emergency/history`),

  /** WebSocket URL พร้อม token query — caller ใช้ new WebSocket(url) */
  liveURL: (alertId) => {
    const token = getToken();
    const wsBase = BASE.replace(/^http/, 'ws');
    return `${wsBase}/api/emergency/${alertId}/live?token=${encodeURIComponent(token || '')}`;
  },
};

export default emergencyAPI;
