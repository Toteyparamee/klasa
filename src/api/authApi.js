'use client';

// Auth API - จัดการ Authentication และ User
import { buildURL, apiRequest, getHeaders } from './config';

export const authAPI = {
  // Login
  async login(username, password) {
    const url = buildURL('LOGIN', '/server/login');
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  },

  // Get profile
  async getProfile(token) {
    const url = buildURL('LOGIN', '/server/profile');
    return apiRequest(url, { token });
  },

  // ลืมรหัสผ่าน — ขอลิงก์รีเซ็ตทาง email
  async forgotPassword(email) {
    const url = buildURL('LOGIN', '/server/forgot-password');
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Forgot password request failed');
    }
    return data;
  },

  // ตั้งรหัสผ่านใหม่ด้วย token จากอีเมล
  async resetPassword(token, newPassword) {
    const url = buildURL('LOGIN', '/server/reset-password');
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Reset password failed');
    }
    return data;
  },

  // Refresh token
  async refreshToken(refreshToken) {
    const url = buildURL('LOGIN', '/server/refresh');
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Token refresh failed');
    }
    return data;
  },
};

export const userAPI = {
  // Get all users
  async getUsers(token) {
    const url = buildURL('LOGIN', '/server/users');
    return apiRequest(url, { token });
  },

  // Create user
  async createUser(userData, token) {
    const url = buildURL('LOGIN', '/server/users');
    return apiRequest(url, {
      method: 'POST',
      body: userData,
      token,
    });
  },

  // Update user
  async updateUser(id, userData, token) {
    const url = buildURL('LOGIN', `/server/users/${id}`);
    return apiRequest(url, {
      method: 'PUT',
      body: userData,
      token,
    });
  },

  // Delete user
  async deleteUser(id, token) {
    const url = buildURL('LOGIN', `/server/users/${id}`);
    return apiRequest(url, {
      method: 'DELETE',
      token,
    });
  },
};

export default authAPI;
