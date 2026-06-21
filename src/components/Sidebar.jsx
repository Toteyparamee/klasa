'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AdminSchoolSelector from './AdminSchoolSelector';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ปิด sidebar เมื่อเปลี่ยนหน้า
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ป้องกัน scroll body เมื่อ sidebar เปิดบนมือถือ
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const menuItems = [
    { path: '/dashboard',       icon: '🏠', label: 'หน้าหลัก',         roles: ['admin', 'editor', 'viewer'] },
    { path: '/personnel',       icon: '👥', label: 'จัดการบุคลากร',     roles: ['admin', 'editor'] },
    { path: '/users',           icon: '👤', label: 'จัดการผู้ใช้',       roles: ['admin'] },
    { path: '/news',            icon: '📰', label: 'จัดการข่าวสาร',     roles: ['admin', 'editor'] },
    { path: '/behavior',        icon: '⭐', label: 'คะแนนพฤติกรรม',     roles: ['admin', 'editor'] },
    { path: '/settings',        icon: '⚙️', label: 'ตั้งค่าระบบ',        roles: ['admin', 'editor'] },
    { path: '/emergency',       icon: '🚨', label: 'แจ้งเหตุฉุกเฉิน',   roles: ['admin', 'editor'] },
    { path: '/academic-report', icon: '📊', label: 'รายงานวิชาการ',     roles: ['admin', 'editor', 'viewer'] },
  ];

  const isActive = (path) => pathname === path;
  const canAccess = (roles) => roles.includes(user?.role);

  const sidebarContent = (
    <div className="w-[280px] h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo / Brand */}
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <img src="/logoklasa.png" alt="Klasa" className="h-9 w-auto object-contain" />
            <span className="text-[15px] font-bold text-gray-800 leading-tight">ระบบจัดการโรงเรียน</span>
          </div>
          {/* ปุ่มปิดบนมือถือ */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 border-0 bg-transparent cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {/* User info */}
        <div className="flex items-center gap-3 bg-blue-50 px-3 py-2.5 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">{user?.username}</div>
            <div className="text-xs text-blue-500 font-medium">
              {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'editor' ? 'ผู้แก้ไข' : 'ผู้ดู'}
            </div>
          </div>
        </div>
      </div>

      {/* School selector สำหรับ admin */}
      {user?.role === 'admin' && (
        <div className="border-b border-gray-100 pt-3">
          <AdminSchoolSelector />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">เมนูหลัก</div>
        {menuItems.map((item) => {
          if (!canAccess(item.roles)) return null;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full px-3 py-2.5 rounded-xl border-0 cursor-pointer flex items-center gap-3 text-sm font-medium transition-all duration-150 mb-0.5 text-left ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-base w-6 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2.5 bg-transparent border border-gray-200 text-gray-500 rounded-xl cursor-pointer flex items-center gap-3 text-sm font-medium transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-600"
        >
          <span className="text-base w-6 text-center">🚪</span>
          <span className="flex-1">ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — fixed, always visible */}
      <div className="hidden md:block fixed left-0 top-0 h-screen z-[1000] shadow-sm">
        {sidebarContent}
      </div>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[1100] p-2 bg-white rounded-xl shadow-md border border-gray-200 cursor-pointer"
        aria-label="เปิดเมนู"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Mobile: overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[1050]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-in drawer */}
      <div
        className={`md:hidden fixed left-0 top-0 h-screen z-[1060] shadow-xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
