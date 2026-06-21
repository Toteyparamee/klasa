'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, schoolAPI, personnelAPI } from '../services/api';
import Sidebar from '../components/Sidebar';

const UserManagementPage = () => {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    schoolId: '',
    schoolName: '',
    teacher_code: ''
  });
  const [filterRole, setFilterRole] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers(token);
      setUsers(response.data || response);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await schoolAPI.getSchools(token);
      setSchools(response.data || response);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const fetchTeachers = async (schoolId) => {
    try {
      const response = await personnelAPI.getTeachers(token, schoolId || undefined);
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      setTeachers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userAPI.updateUser(editingUser.id, formData, token);
        alert('แก้ไขข้อมูลผู้ใช้สำเร็จ');
      } else {
        await userAPI.createUser(formData, token);
        alert('เพิ่มผู้ใช้สำเร็จ');
      }
      setShowAddForm(false);
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'student',
        schoolId: '',
        schoolName: '',
        teacher_code: ''
      });
      fetchUsers();
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      schoolId: user.schoolId || '',
      schoolName: user.schoolName || '',
      teacher_code: user.teacher_code || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) {
      try {
        await userAPI.deleteUser(userId, token);
        alert('ลบผู้ใช้สำเร็จ');
        fetchUsers();
      } catch (error) {
        alert('ไม่สามารถลบผู้ใช้ได้: ' + error.message);
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'student',
      schoolId: '',
      schoolName: '',
      teacher_code: ''
    });
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterClass !== 'all' && u.className !== filterClass) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        u.username?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.firstName?.toLowerCase().includes(search) ||
        u.lastName?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Get unique class names from users
  const classNames = [...new Set(users.filter(u => u.className).map(u => u.className))].sort();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full text-xs font-semibold';
      case 'teacher':
        return 'bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold';
      case 'editor':
        return 'bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full text-xs font-semibold';
      case 'student':
      default:
        return 'bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'teacher':
        return 'ครู';
      case 'editor':
        return 'ผู้แก้ไข';
      case 'student':
      default:
        return 'นักเรียน';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
              <p className="text-sm text-gray-500 mt-1">จัดการบัญชีผู้ใช้งานในระบบ</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center py-16 text-gray-400">
              กำลังโหลด...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
        <div className="p-8">
          {/* Page header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
              <p className="text-sm text-gray-500 mt-1">จัดการบัญชีผู้ใช้งานในระบบ</p>
            </div>
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold">
              <span>ผู้ใช้งานทั้งหมด: {users.length} คน {filterRole !== 'all' || filterClass !== 'all' || searchText ? `(แสดง ${filteredUsers.length} คน)` : ''}</span>
            </div>
          </div>

          {/* User content panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-[1400px] mx-auto">
            {/* Section header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">รายชื่อผู้ใช้งานระบบ</h2>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    if (showAddForm) handleCancel();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                >
                  {showAddForm ? 'ยกเลิก' : '+ เพิ่มผู้ใช้'}
                </button>
              )}
            </div>

            {/* Filter bar */}
            <div className="flex gap-4 items-end flex-wrap mb-6 p-4 bg-slate-50 rounded-2xl border border-gray-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">ค้นหา</label>
                <input
                  type="text"
                  placeholder="ชื่อผู้ใช้, อีเมล..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 min-w-[200px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">บทบาท</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white cursor-pointer min-w-[150px]">
                  <option value="all">ทั้งหมด</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                  <option value="teacher">ครู</option>
                  <option value="student">นักเรียน</option>
                  <option value="editor">ผู้แก้ไข</option>
                </select>
              </div>
              {classNames.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">ห้องเรียน</label>
                  <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white cursor-pointer min-w-[150px]">
                    <option value="all">ทั้งหมด</option>
                    {classNames.map((cn) => (
                      <option key={cn} value={cn}>{cn}</option>
                    ))}
                  </select>
                </div>
              )}
              {(filterRole !== 'all' || filterClass !== 'all' || searchText) && (
                <button
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors whitespace-nowrap"
                  onClick={() => { setFilterRole('all'); setFilterClass('all'); setSearchText(''); }}
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            {showAddForm && (
              <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-5">{editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-600">ชื่อผู้ใช้ *</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="ชื่อผู้ใช้"
                        required
                        disabled={!!editingUser}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-600">อีเมล *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="user@example.com"
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-600">รหัสผ่าน {editingUser ? '(เว้นว่างหากไม่ต้องการเปลี่ยน)' : '*'}</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="รหัสผ่าน"
                        required={!editingUser}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-600">บทบาท *</label>
                      <select
                        value={formData.role}
                        onChange={(e) => {
                          const role = e.target.value;
                          setFormData({ ...formData, role, teacher_code: '' });
                          if (role === 'teacher') fetchTeachers(formData.schoolId);
                        }}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                      >
                        <option value="student">นักเรียน</option>
                        <option value="teacher">ครู</option>
                        <option value="editor">ผู้แก้ไข</option>
                        <option value="admin">ผู้ดูแลระบบ</option>
                      </select>
                    </div>

                    {formData.role === 'teacher' && (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-gray-600">เลือกครู *</label>
                        <select
                          value={formData.teacher_code}
                          onChange={(e) => {
                            const code = e.target.value;
                            const teacher = teachers.find(t => t.teacher_code === code);
                            setFormData({
                              ...formData,
                              teacher_code: code,
                              first_name: teacher?.first_name_th || formData.first_name,
                              last_name: teacher?.last_name_th || formData.last_name,
                            });
                          }}
                          required
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                        >
                          <option value="">-- เลือกครู --</option>
                          {teachers.map((t) => (
                            <option key={t.teacher_code} value={t.teacher_code}>
                              {t.title_th}{t.first_name_th} {t.last_name_th} ({t.teacher_code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-600">โรงเรียน (ถ้ามี)</label>
                      <select
                        value={formData.schoolId || ''}
                        onChange={(e) => {
                          const selectedSchoolId = e.target.value;
                          const selectedSchool = schools.find(s => s.id === parseInt(selectedSchoolId));
                          setFormData({
                            ...formData,
                            schoolId: selectedSchoolId,
                            schoolName: selectedSchool ? selectedSchool.name : '',
                            teacher_code: ''
                          });
                          if (formData.role === 'teacher') fetchTeachers(selectedSchoolId);
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                      >
                        <option value="">-- เลือกโรงเรียน --</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2.5 justify-end pt-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors">
                      {editingUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
                    </button>
                    <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors">
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-5 mt-2">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all relative hover:border-blue-200 hover:shadow-md">
                  {/* User header */}
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {(user.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base font-bold text-gray-900">{user.username}</h3>
                        <span className={getRoleBadgeClass(user.role)}>
                          {getRoleText(user.role)}
                        </span>
                      </div>
                    </div>
                    {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold border-none cursor-pointer transition-colors"
                          title="แก้ไข"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-100 cursor-pointer transition-colors"
                          title="ลบ"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                      <span className="font-semibold text-gray-500 text-xs">อีเมล</span>
                      <span className="text-gray-700 text-xs">{user.email}</span>
                    </div>
                    {user.schoolName && (
                      <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                        <span className="font-semibold text-gray-500 text-xs">โรงเรียน</span>
                        <span className="text-gray-700 text-xs">{user.schoolName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                      <span className="font-semibold text-gray-500 text-xs">สร้างเมื่อ</span>
                      <span className="text-gray-700 text-xs">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'}
                      </span>
                    </div>
                  </div>

                  {currentUser?.id === user.id && (
                    <div className="absolute top-3 right-3 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      คุณ
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-16 text-gray-400 bg-slate-50 rounded-2xl border-2 border-dashed border-gray-200 mt-4">
                <p>{users.length === 0 ? 'ยังไม่มีผู้ใช้ในระบบ' : 'ไม่พบผู้ใช้ตามเงื่อนไขที่เลือก'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
