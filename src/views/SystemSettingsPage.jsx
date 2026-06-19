'use client';

import { Component, useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import SemesterSettings from '../components/SemesterSettings';
import AppVersionSettings from '../components/AppVersionSettings';
import { useAuth } from '../context/AuthContext';
import { uploadAPI } from '../api/uploadApi';
import { getToken } from '../api/config';
import { useSchoolId } from '../hooks/useSchoolId';

class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#c62828', background: '#ffebee', borderRadius: 8 }}>
          เกิดข้อผิดพลาดในส่วนนี้: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const fetchLogoBlobUrl = async (schoolId, bust = false) => {
  const token = getToken();
  const url = uploadAPI.getSchoolLogoUrl(schoolId, bust);
  console.log('[logo] GET', url);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  console.log('[logo] status', r.status, 'content-type', r.headers.get('content-type'), 'cf-cache', r.headers.get('cf-cache-status'));
  if (!r.ok) return null;
  const blob = await r.blob();
  console.log('[logo] blob size', blob.size, 'type', blob.type);
  return URL.createObjectURL(blob);
};

const SchoolLogoSection = () => {
  const schoolId = useSchoolId();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    let revoked = false;
    fetchLogoBlobUrl(schoolId, true).then((blobUrl) => {
      if (!revoked && blobUrl) setPreview(blobUrl);
    });
    return () => { revoked = true; };
  }, [schoolId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setError('กรุณาเลือกไฟล์รูปภาพ'); return; }
    if (!schoolId) { setError('กรุณาเลือกโรงเรียนก่อน'); return; }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      await uploadAPI.uploadSchoolLogo(schoolId, file);
      setSuccess('อัปโหลดรูปโรงเรียนสำเร็จ');
      const blobUrl = await fetchLogoBlobUrl(schoolId, true);
      if (blobUrl) setPreview(blobUrl);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">รูปโรงเรียน</h2>
      <p className="text-sm text-gray-500 mb-5">รองรับ JPG, PNG, WebP ขนาดไม่เกิน 10MB</p>
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="school logo" className="w-full h-full object-contain" onError={() => setPreview(null)} />
          ) : (
            <span className="text-4xl select-none">🏫</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            เลือกรูปภาพ
          </button>
          <button type="button" onClick={handleUpload} disabled={uploading || !schoolId} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {uploading ? 'กำลังอัปโหลด...' : 'บันทึกรูปโรงเรียน'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          {!schoolId && <p className="text-xs text-amber-600">กรุณาเลือกโรงเรียนจาก Sidebar ด้านซ้ายก่อนอัปโหลด</p>}
        </div>
      </div>
    </div>
  );
};

const SystemSettingsPage = () => {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-[280px] min-h-screen bg-slate-50">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
            <p className="text-sm text-gray-500 mt-1">จัดการการตั้งค่าต่างๆ ของระบบ</p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionErrorBoundary>
                <SchoolLogoSection />
              </SectionErrorBoundary>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionErrorBoundary>
                <SemesterSettings />
              </SectionErrorBoundary>
            </div>

            {user?.role === 'admin' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <SectionErrorBoundary>
                  <AppVersionSettings />
                </SectionErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
