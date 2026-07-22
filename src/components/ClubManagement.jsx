'use client';

import { useState, useEffect, useCallback } from 'react';
import { clubAPI, getToken, API_CONFIG } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSchoolId } from '../hooks/useSchoolId';

const GRADE_LEVEL_OPTIONS = [
  { key: 'junior', label: 'มัธยมต้น (ม.1-3)' },
  { key: 'senior', label: 'มัธยมปลาย (ม.4-6)' },
];

const gradeLevelLabel = (key) => GRADE_LEVEL_OPTIONS.find((g) => g.key === key)?.label || key;

const emptyForm = {
  name: '',
  description: '',
  advisor_teacher_code: '',
  capacity: null,
  target_grade_levels: [],
  is_registration_open: true,
  academic_year: API_CONFIG.DEFAULT_ACADEMIC_YEAR,
};

const ClubManagement = ({ teachers = [] }) => {
  const { getValidToken } = useAuth();
  const schoolId = useSchoolId();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [membersClub, setMembersClub] = useState(null); // club object ที่กำลังดูสมาชิก
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await clubAPI.getClubs(null, token);
      setClubs(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (club) => {
    setEditingId(club.id);
    setForm({
      name: club.name || '',
      description: club.description || '',
      advisor_teacher_code: club.advisor_teacher_code || '',
      capacity: club.capacity ?? null,
      target_grade_levels: club.target_grade_levels || [],
      is_registration_open: club.is_registration_open ?? true,
      academic_year: club.academic_year || API_CONFIG.DEFAULT_ACADEMIC_YEAR,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('กรุณากรอกชื่อชุมนุม');
      return;
    }
    if (!form.academic_year.trim()) {
      alert('กรุณาระบุปีการศึกษา');
      return;
    }
    setSaving(true);
    try {
      const token = await getValidToken();
      const body = {
        ...form,
        capacity: form.capacity === '' || form.capacity === null ? null : Number(form.capacity),
      };
      if (editingId) {
        await clubAPI.updateClub(editingId, body, token);
      } else {
        await clubAPI.createClub(body, token);
      }
      setShowForm(false);
      await loadClubs();
    } catch (err) {
      alert('บันทึกล้มเหลว: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (club) => {
    if (!window.confirm(`ลบชุมนุม "${club.name}" ใช่หรือไม่? (สมาชิกทั้งหมดจะถูกลบด้วย)`)) return;
    try {
      const token = await getValidToken();
      await clubAPI.deleteClub(club.id, token);
      await loadClubs();
    } catch (err) {
      alert('ลบล้มเหลว: ' + err.message);
    }
  };

  const handleToggleRegistration = async (club) => {
    try {
      const token = await getValidToken();
      await clubAPI.updateClub(club.id, { is_registration_open: !club.is_registration_open }, token);
      await loadClubs();
    } catch (err) {
      alert('อัปเดตล้มเหลว: ' + err.message);
    }
  };

  const openMembers = async (club) => {
    setMembersClub(club);
    setMembersLoading(true);
    try {
      const token = await getValidToken();
      const res = await clubAPI.getClubMembers(club.id, token);
      setMembers(res.data || []);
    } catch (err) {
      alert('โหลดรายชื่อสมาชิกล้มเหลว: ' + err.message);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const closeMembers = () => {
    setMembersClub(null);
    setMembers([]);
  };

  const getTeacherName = (teacherCode) => {
    const teacher = teachers.find((t) => t.teacherCode === teacherCode);
    return teacher
      ? `${teacher.titleTh || ''}${teacher.firstNameTh} ${teacher.lastNameTh}`
      : (teacherCode || '-');
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';

  return (
    <div className="p-6 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ชุมนุม</h2>
          <p className="text-sm text-gray-500 mt-1">
            ชุมนุมทุกวันพฤหัสบดี คาบ 8 — จัดการรายชื่อชุมนุมและสมาชิกที่นี่
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
            onClick={openAdd}
          >
            + เพิ่มชุมนุม
          </button>
          <button
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60"
            onClick={loadClubs}
            disabled={loading}
          >
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 mb-6 text-sm">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 px-5 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          กำลังโหลด...
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-16 px-5 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          ยังไม่มีชุมนุม กดปุ่ม + เพื่อเพิ่ม
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {clubs.map((club) => (
            <div key={club.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div
                className="h-[64px] relative flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1, #6366F1b3)' }}
              >
                <span className="text-[32px] opacity-85">🎭</span>
                <span
                  className={`absolute top-2 right-2 px-2.5 py-1 rounded-xl text-xs font-semibold text-white ${
                    club.is_registration_open ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                >
                  {club.is_registration_open ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="m-0 text-sm font-bold text-gray-900">{club.name}</h3>
                {club.description && (
                  <p className="m-0 text-gray-500 text-xs leading-relaxed">{club.description}</p>
                )}
                <div className="flex flex-col gap-1 text-xs text-gray-500">
                  {club.advisor_teacher_code && (
                    <span>👨‍🏫 ครูที่ปรึกษา: {getTeacherName(club.advisor_teacher_code)}</span>
                  )}
                  <span>
                    👥 สมาชิก {club.member_count ?? 0}
                    {club.capacity ? ` / ${club.capacity} คน` : ' คน (ไม่จำกัด)'}
                  </span>
                  {club.target_grade_levels && club.target_grade_levels.length > 0 && (
                    <span>🎯 {club.target_grade_levels.map(gradeLevelLabel).join(', ')}</span>
                  )}
                  <span>📅 ปีการศึกษา {club.academic_year}</span>
                </div>
                <div className="flex justify-end gap-1 mt-auto pt-2">
                  <button
                    className="bg-transparent border-none px-3 h-9 rounded-full cursor-pointer text-xs font-semibold inline-flex items-center justify-center hover:bg-gray-100 transition-colors text-indigo-600"
                    onClick={() => openMembers(club)}
                    title="ดูรายชื่อสมาชิก"
                  >
                    👥 ดูรายชื่อ
                  </button>
                  <button
                    className="bg-transparent border-none w-9 h-9 rounded-full cursor-pointer text-base inline-flex items-center justify-center hover:bg-gray-100 transition-colors"
                    onClick={() => handleToggleRegistration(club)}
                    title={club.is_registration_open ? 'ปิดรับสมัคร' : 'เปิดรับสมัคร'}
                    style={{ color: club.is_registration_open ? '#4CAF50' : '#FF9800' }}
                  >
                    {club.is_registration_open ? '🔓' : '🔒'}
                  </button>
                  <button
                    className="bg-transparent border-none w-9 h-9 rounded-full cursor-pointer text-base inline-flex items-center justify-center hover:bg-gray-100 transition-colors"
                    onClick={() => openEdit(club)}
                    title="แก้ไข"
                  >
                    ✏️
                  </button>
                  <button
                    className="bg-transparent border-none w-9 h-9 rounded-full cursor-pointer text-base inline-flex items-center justify-center hover:bg-red-50 transition-colors"
                    onClick={() => handleDelete(club)}
                    title="ลบ"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal สร้าง/แก้ไขชุมนุม */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowForm(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'แก้ไขชุมนุม' : 'เพิ่มชุมนุมใหม่'}</h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <form className="flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1.5 text-sm text-gray-700">
                <span className="font-semibold text-gray-800">ชื่อชุมนุม *</span>
                <input
                  type="text"
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น ชุมนุมดนตรี"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm text-gray-700">
                <span className="font-semibold text-gray-800">รายละเอียด</span>
                <textarea
                  className={`${inputCls} resize-y min-h-[72px]`}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm text-gray-700">
                <span className="font-semibold text-gray-800">ครูที่ปรึกษา</span>
                <select
                  className={inputCls}
                  value={form.advisor_teacher_code}
                  onChange={(e) => setForm({ ...form, advisor_teacher_code: e.target.value })}
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.teacherCode}>
                      {t.titleTh || ''}{t.firstNameTh} {t.lastNameTh}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm text-gray-700">
                <span className="font-semibold text-gray-800">จำนวนที่รับ</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}
                    placeholder="ไม่จำกัด"
                    value={form.capacity ?? ''}
                    disabled={form.capacity === null}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer"
                      checked={form.capacity === null}
                      onChange={(e) => setForm({ ...form, capacity: e.target.checked ? null : '' })}
                    />
                    <span>ไม่จำกัดจำนวน</span>
                  </label>
                </div>
              </label>

              <div className="flex flex-col gap-2">
                <span className="font-semibold text-gray-800 text-sm">กลุ่มเป้าหมาย</span>
                <span className="text-xs text-gray-400">ไม่เลือก = เปิดรับนักเรียนทุกระดับชั้น</span>
                <div className="flex gap-2">
                  {GRADE_LEVEL_OPTIONS.map((g) => {
                    const checked = form.target_grade_levels.includes(g.key);
                    return (
                      <button
                        key={g.key}
                        type="button"
                        className={`px-3 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() =>
                          setForm({
                            ...form,
                            target_grade_levels: checked
                              ? form.target_grade_levels.filter((v) => v !== g.key)
                              : [...form.target_grade_levels, g.key],
                          })
                        }
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex flex-col gap-1.5 text-sm text-gray-700">
                <span className="font-semibold text-gray-800">ปีการศึกษา *</span>
                <input
                  type="text"
                  className={inputCls}
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  placeholder="เช่น 2568"
                />
              </label>

              <label className="inline-flex flex-row items-center gap-1.5 text-sm font-medium text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={form.is_registration_open}
                  onChange={(e) => setForm({ ...form, is_registration_open: e.target.checked })}
                />
                <span>เปิดรับสมัคร</span>
              </label>

              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึก' : 'เพิ่ม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal รายชื่อสมาชิก */}
      {membersClub && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeMembers}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">สมาชิกชุมนุม: {membersClub.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {members.length} คน
                  {membersClub.capacity ? ` / รับ ${membersClub.capacity} คน` : ' (ไม่จำกัด)'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMembers}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {membersLoading ? (
                <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีสมาชิก</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-gray-500">
                        <th className="p-3 font-semibold">ชื่อนักเรียน</th>
                        <th className="p-3 font-semibold">รหัสนักเรียน</th>
                        <th className="p-3 font-semibold">ชั้น/ห้อง</th>
                        <th className="p-3 font-semibold">วันที่เข้าร่วม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-gray-50 last:border-none">
                          <td className="p-3 text-gray-800">{m.student_name || '-'}</td>
                          <td className="p-3 text-gray-500">{m.student_code}</td>
                          <td className="p-3 text-gray-500">
                            {m.grade ? `${m.grade}/${m.section}` : '-'}
                          </td>
                          <td className="p-3 text-gray-500">
                            {m.joined_at ? new Date(m.joined_at).toLocaleDateString('th-TH') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubManagement;
