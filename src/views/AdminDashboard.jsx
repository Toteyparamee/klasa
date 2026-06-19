'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { uploadAPI } from '../api/uploadApi';

const SchoolLocationEditor = dynamic(() => import('../components/SchoolLocationEditor'), { ssr: false });

// ดึง school_id จาก JWT payload
const getSchoolIdFromToken = () => {
  const token = sessionStorage.getItem('access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.school_id ?? null;
  } catch {
    return null;
  }
};

const SchoolAvatar = ({ schoolId, name }) => {
  const { getValidToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let revoked = false;
    getValidToken().then((token) => {
      if (!token) return;
      const url = uploadAPI.getSchoolLogoUrl(schoolId);
      return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => {
          if (!revoked && blob) setBlobUrl(URL.createObjectURL(blob));
        });
    }).catch(() => {});
    return () => { revoked = true; };
  }, [schoolId, getValidToken]);

  if (blobUrl && !hasError) {
    return (
      <img
        src={blobUrl}
        alt={name}
        onError={() => setHasError(true)}
        className="w-11 h-11 rounded-full object-cover flex-shrink-0 bg-gray-100"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 select-none">
      {name?.charAt(0) || '?'}
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { schools, addSchool, deleteSchool, updateSchool } = useSchool();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', address: '' });
  const [editingLocationSchool, setEditingLocationSchool] = useState(null);

  const isAdmin = user?.role === 'admin';
  const editorSchoolId = !isAdmin ? getSchoolIdFromToken() : null;
  const visibleSchools = isAdmin
    ? schools
    : schools.filter((s) => s.id === editorSchoolId);


  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (newSchool.name && newSchool.address) {
      try {
        await addSchool(newSchool);
        setNewSchool({ name: '', address: '' });
        setShowAddForm(false);
      } catch (error) {
        alert('ไม่สามารถเพิ่มโรงเรียนได้: ' + error.message);
      }
    }
  };

  const handleDeleteSchool = async (schoolId) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบโรงเรียนนี้?')) {
      try {
        await deleteSchool(schoolId);
      } catch (error) {
        alert('ไม่สามารถลบโรงเรียนได้: ' + error.message);
      }
    }
  };

  const handleViewSchool = (schoolId) => {
    router.push(`/school/${schoolId}`);
  };

  const handleSaveLocation = async (data) => {
    try {
      await updateSchool(editingLocationSchool.id, data);
      setEditingLocationSchool(null);
    } catch (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-[280px] min-h-screen bg-slate-50">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">

            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">รายการโรงเรียน</h1>
              <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลโรงเรียนทั้งหมดในระบบ</p>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base font-semibold text-gray-900">รายการโรงเรียนทั้งหมด</h2>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                  >
                    {showAddForm ? 'ยกเลิก' : '+ เพิ่มโรงเรียน'}
                  </button>
                )}
              </div>

              {showAddForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                  <form onSubmit={handleAddSchool}>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="ชื่อโรงเรียน"
                        value={newSchool.name}
                        onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                      />
                      <input
                        type="text"
                        placeholder="ที่อยู่"
                        value={newSchool.address}
                        onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors whitespace-nowrap"
                      >
                        บันทึก
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
                {visibleSchools.map((school) => (
                  <div
                    key={school.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <SchoolAvatar schoolId={school.id} name={school.name} />
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 leading-tight">{school.name}</h3>
                          <p className="text-sm text-gray-500">{school.address}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {school.classrooms.length} ห้องเรียน
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {school.classrooms.reduce((sum, c) => sum + c.students.length, 0)} นักเรียน
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleViewSchool(school.id)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                      >
                        ดูรายละเอียด
                      </button>
                      {(user?.role === 'admin' || user?.role === 'editor') && (
                        <button
                          onClick={() => setEditingLocationSchool(school)}
                          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                        >
                          📍 ตั้งค่าพิกัด
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteSchool(school.id)}
                          className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold border border-red-100 cursor-pointer transition-colors"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {visibleSchools.length === 0 && (
                <div className="text-center px-5 py-16 text-gray-400 text-base">
                  <p>ยังไม่มีโรงเรียนในระบบ</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {editingLocationSchool && (
        <SchoolLocationEditor
          school={editingLocationSchool}
          onSave={handleSaveLocation}
          onClose={() => setEditingLocationSchool(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
