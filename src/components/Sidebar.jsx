'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AdminSchoolSelector from './AdminSchoolSelector';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

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

  return (
    <div className="w-[280px] h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 shadow-sm z-[1000]">
      {/* Logo / Brand */}
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <img src="/logoklasa.png" alt="Klasa" className="h-9 w-auto object-contain" />
          <span className="text-[15px] font-bold text-gray-800 leading-tight">ระบบจัดการโรงเรียน</span>
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
};

export default Sidebar;
