'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useSchoolId } from '../hooks/useSchoolId';
import { newsAPI } from '../api/newsApi';

const COLOR_OPTIONS = [
  { key: 'blue', hex: '#2196F3' },
  { key: 'purple', hex: '#9C27B0' },
  { key: 'orange', hex: '#FF9800' },
  { key: 'green', hex: '#4CAF50' },
  { key: 'red', hex: '#F44336' },
  { key: 'pink', hex: '#E91E63' },
  { key: 'teal', hex: '#009688' },
  { key: 'indigo', hex: '#3F51B5' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  color: 'blue',
  is_published: true,
  show_title: true,
  show_description: true,
  show_date: true,
  show_image: true,
  image_url: null,
};

const NewsManagementPage = () => {
  const { getValidToken } = useAuth();
  const schoolId = useSchoolId();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const res = await newsAPI.getNews(token, schoolId);
      setNewsList(res.news || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getValidToken, schoolId]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      description: item.description || '',
      date: item.date || '',
      color: item.color || 'blue',
      is_published: item.is_published ?? true,
      show_title: item.show_title ?? true,
      show_description: item.show_description ?? true,
      show_date: item.show_date ?? true,
      show_image: item.show_image ?? true,
      image_url: item.image_url || null,
    });
    setShowForm(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = await getValidToken();
      const res = await newsAPI.uploadImage(file, token);
      setForm((f) => ({ ...f, image_url: res.url }));
    } catch (err) {
      alert('อัปโหลดรูปล้มเหลว: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getValidToken();
      if (editingId) {
        await newsAPI.updateNews(editingId, form, token);
      } else {
        await newsAPI.createNews(form, token, schoolId);
      }
      setShowForm(false);
      await loadNews();
    } catch (err) {
      alert('บันทึกล้มเหลว: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const label = item.title || '(ไม่มีหัวข้อ)';
    if (!window.confirm(`ลบ "${label}" ใช่หรือไม่?`)) return;
    try {
      const token = await getValidToken();
      await newsAPI.deleteNews(item.id, token);
      await loadNews();
    } catch (err) {
      alert('ลบล้มเหลว: ' + err.message);
    }
  };

  const handleTogglePublish = async (item) => {
    try {
      const token = await getValidToken();
      await newsAPI.updateNews(item.id, { is_published: !item.is_published }, token);
      await loadNews();
    } catch (err) {
      alert('อัปเดตล้มเหลว: ' + err.message);
    }
  };

  const colorHex = (key) => COLOR_OPTIONS.find((c) => c.key === key)?.hex || '#2196F3';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">จัดการข่าวสาร</h1>
            <p className="text-sm text-gray-500 mt-1">สร้าง แก้ไข และจัดการข่าวสารสำหรับแสดงในแอปนักเรียนและครู</p>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={openAdd}
            >+ เพิ่มข่าวสาร</button>
            <button
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={loadNews}
              disabled={loading}
            >
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 mb-6 text-sm">
              เกิดข้อผิดพลาด: {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 px-5 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">กำลังโหลด...</div>
          ) : newsList.length === 0 ? (
            <div className="text-center py-16 px-5 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">ยังไม่มีข่าวสาร กดปุ่ม + เพื่อเพิ่ม</div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {newsList.map((item) => {
                const imgSrc = newsAPI.resolveImageUrl(item.image_url);
                const showTitle = item.show_title ?? true;
                const showDescription = item.show_description ?? true;
                const showDate = item.show_date ?? true;
                const showImage = item.show_image ?? true;
                const c = colorHex(item.color);
                const hasImage = showImage && imgSrc;
                const hasGradient = showImage && !imgSrc;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    {hasImage && (
                      <div className="h-[150px] relative overflow-hidden">
                        <img src={imgSrc} alt="" className="w-full h-full object-cover block" />
                        {!item.is_published && (
                          <span className="absolute top-2 right-2 bg-orange-400 text-white px-2.5 py-1 rounded-xl text-xs font-semibold">ไม่เผยแพร่</span>
                        )}
                      </div>
                    )}
                    {hasGradient && (
                      <div
                        className="h-[80px] relative flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${c}, ${c}b3)` }}
                      >
                        <span className="text-[40px] opacity-85 text-white">📰</span>
                        {!item.is_published && (
                          <span className="absolute top-2 right-2 bg-orange-400 text-white px-2.5 py-1 rounded-xl text-xs font-semibold">ไม่เผยแพร่</span>
                        )}
                      </div>
                    )}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      {showTitle && item.title && (
                        <h3 className="m-0 text-sm font-bold text-gray-900">{item.title}</h3>
                      )}
                      {showDescription && item.description && (
                        <p className="m-0 text-gray-500 text-xs leading-relaxed">{item.description}</p>
                      )}
                      {showDate && item.date && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                          <span>📅</span>
                          <span>{item.date}</span>
                        </div>
                      )}
                      <div className="flex justify-end gap-1 mt-auto pt-2">
                        <button
                          className="bg-transparent border-none w-9 h-9 rounded-full cursor-pointer text-base inline-flex items-center justify-center hover:bg-gray-100 transition-colors"
                          onClick={() => handleTogglePublish(item)}
                          title={item.is_published ? 'ซ่อน' : 'เผยแพร่'}
                          style={{ color: item.is_published ? '#4CAF50' : '#FF9800' }}
                        >
                          {item.is_published ? '👁️' : '🚫'}
                        </button>
                        <button
                          className="bg-transparent border-none w-9 h-9 rounded-full cursor-pointer text-base inline-flex items-center justify-center hover:bg-gray-100 transition-colors"
                          onClick={() => openEdit(item)}
                          title="แก้ไข"
                        >✏️</button>
                        <button
                          className="bg-transparent border-none w-9 h-9 rounded-full cursor-pointer text-base inline-flex items-center justify-center hover:bg-red-50 transition-colors"
                          onClick={() => handleDelete(item)}
                          title="ลบ"
                        >🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => !saving && setShowForm(false)}
        title={editingId ? 'แก้ไขข่าวสาร' : 'เพิ่มข่าวสารใหม่'}
        size="medium"
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm text-gray-700">
              <div className="flex justify-between items-center font-semibold text-gray-800">
                <span>หัวข้อข่าว</span>
                <label className="inline-flex flex-row items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={form.show_title}
                    onChange={(e) => setForm({ ...form, show_title: e.target.checked })}
                  />
                  <span>แสดง</span>
                </label>
              </div>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="เช่น ประกาศวันหยุด"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-gray-700">
              <div className="flex justify-between items-center font-semibold text-gray-800">
                <span>รายละเอียด</span>
                <label className="inline-flex flex-row items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={form.show_description}
                    onChange={(e) => setForm({ ...form, show_description: e.target.checked })}
                  />
                  <span>แสดง</span>
                </label>
              </div>
              <textarea
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-y min-h-[72px]"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-gray-700">
              <div className="flex justify-between items-center font-semibold text-gray-800">
                <span>วันที่</span>
                <label className="inline-flex flex-row items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={form.show_date}
                    onChange={(e) => setForm({ ...form, show_date: e.target.checked })}
                  />
                  <span>แสดง</span>
                </label>
              </div>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                placeholder="เช่น 15 สิงหาคม 2567"
              />
            </label>

            <div className="flex justify-between items-center font-semibold text-sm text-gray-800">
              <span>รูปภาพ</span>
              <label className="inline-flex flex-row items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={form.show_image}
                  onChange={(e) => setForm({ ...form, show_image: e.target.checked })}
                />
                <span>แสดง</span>
              </label>
            </div>
            {form.image_url ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={newsAPI.resolveImageUrl(form.image_url)} alt="preview" className="w-full h-[180px] object-cover block" />
                <button
                  type="button"
                  className="absolute top-2 right-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold border border-red-100 cursor-pointer"
                  onClick={() => setForm({ ...form, image_url: null })}
                >
                  ลบรูป
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-10 px-5 text-center text-gray-400 text-sm">ไม่มีรูปภาพ</div>
            )}
            <label className="inline-block bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl text-center cursor-pointer font-semibold text-sm border border-blue-100 hover:bg-blue-100 transition-colors">
              {uploading ? 'กำลังอัปโหลด...' : form.image_url ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ'}
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} hidden />
            </label>

            <div className="font-semibold text-sm text-gray-800">สี</div>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`w-9 h-9 rounded-full border-[3px] cursor-pointer p-0 transition-transform hover:scale-110 ${form.color === c.key ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ background: c.hex }}
                  onClick={() => setForm({ ...form, color: c.key })}
                  title={c.key}
                />
              ))}
            </div>

            <label className="inline-flex flex-row items-center gap-1.5 text-sm font-medium text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              <span>เผยแพร่</span>
            </label>

          <div className="flex justify-end gap-2.5 mt-2">
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={saving || uploading}
            >
              {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึก' : 'เพิ่ม'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NewsManagementPage;
