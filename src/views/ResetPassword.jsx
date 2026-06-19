'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '../api/authApi';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('ลิงก์ไม่ถูกต้อง — ไม่พบ token');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirm) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setSuccess('ตั้งรหัสผ่านใหม่เรียบร้อย กำลังพาไปหน้าเข้าสู่ระบบ...');
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-500 to-blue-700">
      <div className="bg-white p-10 rounded-[10px] shadow-[0_10px_25px_rgba(0,0,0,0.2)] w-full max-w-[400px]">
        <h1 className="text-center text-[#333] mb-[30px] text-2xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
        {email && (
          <p style={{ color: '#666', marginBottom: 16 }}>
            สำหรับบัญชี: <strong>{email}</strong>
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block mb-2 text-[#555] font-medium">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              required
              minLength={6}
              disabled={!token || loading}
              className="w-full px-3 py-3 border border-[#ddd] rounded-[5px] text-sm box-border focus:outline-none focus:border-[#2563eb] disabled:opacity-60"
            />
          </div>
          <div className="mb-5">
            <label className="block mb-2 text-[#555] font-medium">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              required
              minLength={6}
              disabled={!token || loading}
              className="w-full px-3 py-3 border border-[#ddd] rounded-[5px] text-sm box-border focus:outline-none focus:border-[#2563eb] disabled:opacity-60"
            />
          </div>
          {error && (
            <div className="bg-[#ffeeee] text-[#cc3333] px-3 py-[10px] rounded-[5px] mb-[15px] text-center">
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: 'green', marginBottom: 12 }}>{success}</div>
          )}
          <button
            type="submit"
            disabled={!token || loading}
            className="w-full py-3 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0 rounded-[5px] text-base font-semibold cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/" style={{ color: '#1976d2' }}>
            กลับไปหน้าเข้าสู่ระบบ
          </a>
        </p>
      </div>
    </div>
  );
};

const ResetPassword = () => (
  <Suspense>
    <ResetPasswordForm />
  </Suspense>
);

export default ResetPassword;
