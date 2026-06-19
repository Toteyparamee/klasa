'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -right-16 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 right-8 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative z-10 text-center">
          <img src="/logoklasa.png" alt="Klasa" className="h-20 w-auto mx-auto mb-8 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-white mb-3">ระบบจัดการโรงเรียน</h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-xs mx-auto">
            บริหารจัดการข้อมูลนักเรียน บุคลากร<br />และระบบภายในโรงเรียนได้ในที่เดียว
          </p>

          <div className="mt-10 flex gap-6 justify-center">
            {[['👨‍🎓', 'จัดการนักเรียน'], ['📊', 'รายงานวิชาการ'], ['🔔', 'แจ้งเหตุฉุกเฉิน']].map(([icon, label]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center text-2xl">
                  {icon}
                </div>
                <span className="text-blue-200 text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <img src="/logoklasa.png" alt="Klasa" className="h-14 w-auto" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">เข้าสู่ระบบ</h2>
          <p className="text-sm text-gray-500 mb-8">กรุณากรอกข้อมูลเพื่อเข้าใช้งาน</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อผู้ใช้</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่าน</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm border-none bg-none cursor-pointer"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-200 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
                    style={{ animation: 'spin 0.7s linear infinite' }} />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            © 2568 Klasa School Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
