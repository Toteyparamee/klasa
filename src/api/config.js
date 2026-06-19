'use client';

// API Configuration - รวมศูนย์การตั้งค่า API ทั้งหมด

// Environment variables (Next.js ใช้ NEXT_PUBLIC_ prefix สำหรับ client-side)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.klasaapp.com';

const KONG_GATEWAY_URL = API_BASE;
const LOGIN_API_URL = API_BASE;
const PERSONNEL_API_URL = API_BASE;
const SCHEDULE_API_URL = API_BASE;
const BEHAVIOR_API_URL = API_BASE;
const NEWS_API_URL = API_BASE;
const UPLOAD_API_URL = API_BASE;

// Service configuration
export const API_CONFIG = {
  // Base URLs
  BASE_URLS: {
    LOGIN: LOGIN_API_URL,
    PERSONNEL: PERSONNEL_API_URL,
    SCHEDULE: SCHEDULE_API_URL,
    BEHAVIOR: BEHAVIOR_API_URL,
    NEWS: NEWS_API_URL,
    UPLOAD: UPLOAD_API_URL,
  },

  // Service prefixes สำหรับ Kong Gateway
  SERVICE_PREFIX: {
    LOGIN: 'login-service',
    PERSONNEL: 'personnel-service',
    SCHEDULE: 'schedule-service',
    BEHAVIOR: 'behavior-service',
    NEWS: 'news-service',
    UPLOAD: 'upload-service',
  },

  // Default settings
  DEFAULT_SCHOOL_ID: 1,
  DEFAULT_SEMESTER: 2,
  DEFAULT_ACADEMIC_YEAR: '2568',
};

// Helper function: สร้าง URL ตาม environment
export const buildURL = (service, path) => {
  const baseUrl = API_CONFIG.BASE_URLS[service];
  return `${baseUrl}${path}`;
};

// Helper function: สร้าง headers พื้นฐาน
export const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Helper function: ดึง token จาก sessionStorage
export const getToken = () => {
  return sessionStorage.getItem('access_token');
};

// ฟังก์ชัน refresh token (ลงทะเบียนจาก AuthContext)
let _tokenRefresher = null;
export const setTokenRefresher = (fn) => {
  _tokenRefresher = fn;
};

// Helper function: จัดการ response
export const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
};

// Helper function: API request wrapper (พร้อม auto-refresh on 401)
export const apiRequest = async (url, options = {}) => {
  const token = options.token || getToken();

  const buildConfig = (t) => {
    const cfg = {
      method: options.method || 'GET',
      headers: getHeaders(t),
    };
    if (options.body && typeof options.body === 'object') {
      cfg.body = JSON.stringify(options.body);
    }
    return cfg;
  };

  let response = await fetch(url, buildConfig(token));

  // ถ้าได้ 401 และมี refresher → ลอง refresh แล้ว retry ครั้งเดียว
  if (response.status === 401 && _tokenRefresher) {
    const newToken = await _tokenRefresher();
    if (newToken) {
      response = await fetch(url, buildConfig(newToken));
    }
  }

  return handleResponse(response);
};

export default API_CONFIG;
