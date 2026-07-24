'use client';

import { useState, useEffect, useCallback } from 'react';
import { clubAPI, studentAPI, getToken, API_CONFIG } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSchoolId } from '../hooks/useSchoolId';

const GRADE_LEVEL_OPTIONS = [
  { key: 'junior', label: 'มัธยมต้น (ม.1-3)' },
  { key: 'senior', label: 'มัธยมปลาย (ม.4-6)' },
];

const gradeLevelLabel = (key) => GRADE_LEVEL_OPTIONS.find((g) => g.key === key)?.label || key;

const DAY_OPTIONS = [
  { key: 1, label: 'จันทร์' },
  { key: 2, label: 'อังคาร' },
  { key: 3, label: 'พุธ' },
  { key: 4, label: 'พฤหัสบดี' },
  { key: 5, label: 'ศุกร์' },
  { key: 6, label: 'เสาร์' },
  { key: 7, label: 'อาทิตย์' },
];

const PERIOD_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const emptyForm = {
  name: '',
  description: '',
  advisor_teacher_code: '',
  image_url: null,
  capacity: null,
  target_grade_levels: [],
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
  const [uploading, setUploading] = useState(false);

  const [membersClub, setMembersClub] = useState(null); // club object ที่กำลังดูสมาชิก
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Picker เพิ่มนักเรียน (แมนนวล)
  const [showPicker, setShowPicker] = useState(false);
  const [allStudents, setAllStudents] = useState([]); // นักเรียนทั้งโรงเรียน
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [pickerRoom, setPickerRoom] = useState(''); // "grade/section" ที่เลือกกรอง
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelected, setPickerSelected] = useState([]); // student_code ที่เลือก
  const [addingMembers, setAddingMembers] = useState(false);

  const [scheduleConfig, setScheduleConfig] = useState(null); // { day_of_week, period, registration_start, registration_end, is_registration_open } | null
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 4,
    period: 8,
    registration_start: '',
    registration_end: '',
  });
  const [regEnabled, setRegEnabled] = useState(false); // เปิดใช้ช่วงเวลาลงทะเบียนหรือไม่
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // แปลง ISO string (UTC) จาก backend ↔ ค่าที่ <input type="datetime-local"> ต้องการ (local time, ไม่มี timezone)
  const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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

  const loadScheduleConfig = useCallback(async () => {
    try {
      const token = getToken();
      const res = await clubAPI.getScheduleConfig(token);
      if (res.data) {
        setScheduleConfig(res.data);
        setScheduleForm({
          day_of_week: res.data.day_of_week,
          period: res.data.period,
          registration_start: toDatetimeLocal(res.data.registration_start),
          registration_end: toDatetimeLocal(res.data.registration_end),
        });
        // เปิด switch ถ้ามีช่วงเวลาลงทะเบียนตั้งไว้แล้ว
        setRegEnabled(!!(res.data.registration_start && res.data.registration_end));
      }
    } catch (err) {
      // ไม่ critical — แค่ยังไม่มีค่าตั้งไว้ก็ปล่อยเป็น default
    }
  }, []);

  useEffect(() => {
    loadClubs();
    loadScheduleConfig();
  }, [loadClubs, loadScheduleConfig]);

  const handleSaveScheduleConfig = async () => {
    if (regEnabled) {
      if (!scheduleForm.registration_start || !scheduleForm.registration_end) {
        alert('กรุณาระบุเวลาเริ่มและสิ้นสุดการลงทะเบียน');
        return;
      }
      if (new Date(scheduleForm.registration_start) >= new Date(scheduleForm.registration_end)) {
        alert('เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด');
        return;
      }
    }
    setScheduleSaving(true);
    try {
      const token = await getValidToken();
      const body = {
        day_of_week: scheduleForm.day_of_week,
        period: scheduleForm.period,
        // ปิด switch = ส่ง null = ปิดรับสมัครทั้งหมด (backend fail-closed เมื่อไม่มีช่วงเวลา)
        registration_start: regEnabled ? new Date(scheduleForm.registration_start).toISOString() : null,
        registration_end: regEnabled ? new Date(scheduleForm.registration_end).toISOString() : null,
      };
      const res = await clubAPI.updateScheduleConfig(body, token);
      setScheduleConfig(res.data);
      await loadClubs();
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setScheduleSaving(false);
    }
  };

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
      image_url: club.image_url || null,
      capacity: club.capacity ?? null,
      target_grade_levels: club.target_grade_levels || [],
      academic_year: club.academic_year || API_CONFIG.DEFAULT_ACADEMIC_YEAR,
    });
    setShowForm(true);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = await getValidToken();
      const res = await clubAPI.uploadImage(file, token);
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

  const loadMembers = async (clubId) => {
    setMembersLoading(true);
    try {
      const token = await getValidToken();
      const res = await clubAPI.getClubMembers(clubId, token);
      setMembers(res.data || []);
    } catch (err) {
      alert('โหลดรายชื่อสมาชิกล้มเหลว: ' + err.message);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const openMembers = async (club) => {
    setMembersClub(club);
    await loadMembers(club.id);
  };

  const closeMembers = () => {
    setMembersClub(null);
    setMembers([]);
  };

  // ===== Picker เพิ่มนักเรียน =====
  const openPicker = async () => {
    setShowPicker(true);
    setPickerRoom('');
    setPickerSearch('');
    setPickerSelected([]);
    if (allStudents.length === 0) {
      setStudentsLoading(true);
      try {
        const token = await getValidToken();
        const res = await studentAPI.getStudentsAll(token, 2000);
        setAllStudents(res.data || []);
      } catch (err) {
        alert('โหลดรายชื่อนักเรียนล้มเหลว: ' + err.message);
      } finally {
        setStudentsLoading(false);
      }
    }
  };

  const handleAddMembers = async () => {
    if (pickerSelected.length === 0) return;
    setAddingMembers(true);
    try {
      const token = await getValidToken();
      const res = await clubAPI.addMembers(membersClub.id, pickerSelected, token);
      const failed = res.data?.failed || [];
      if (failed.length > 0) {
        const names = failed
          .map((f) => `${studentName(f.student_code)}: ${f.message}`)
          .join('\n');
        alert(`เพิ่มบางคนไม่สำเร็จ:\n${names}`);
      }
      setShowPicker(false);
      await loadMembers(membersClub.id);
      await loadClubs(); // อัปเดต member_count ในการ์ด
    } catch (err) {
      alert('เพิ่มนักเรียนล้มเหลว: ' + err.message);
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (studentCode) => {
    if (!window.confirm('ลบนักเรียนคนนี้ออกจากชุมนุมใช่หรือไม่?')) return;
    try {
      const token = await getValidToken();
      await clubAPI.removeMember(membersClub.id, studentCode, token);
      await loadMembers(membersClub.id);
      await loadClubs();
    } catch (err) {
      alert('ลบสมาชิกล้มเหลว: ' + err.message);
    }
  };

  const studentName = (code) => {
    const s = allStudents.find((st) => st.student_code === code);
    return s ? `${s.title_th || ''}${s.first_name_th} ${s.last_name_th}` : code;
  };

  // ห้องทั้งหมด (grade/section) จากรายชื่อนักเรียน — เรียงตามชั้น/ห้อง
  const roomOptions = Array.from(
    new Set(allStudents.map((s) => `${s.grade}/${s.section}`).filter((r) => r !== '/')),
  ).sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));

  // student_code ที่เป็นสมาชิก active อยู่แล้ว — กันเลือกซ้ำ
  const existingMemberCodes = new Set(members.map((m) => m.student_code));

  const filteredStudents = allStudents.filter((s) => {
    if (existingMemberCodes.has(s.student_code)) return false;
    if (pickerRoom && `${s.grade}/${s.section}` !== pickerRoom) return false;
    if (pickerSearch) {
      const q = pickerSearch.toLowerCase();
      const full = `${s.first_name_th} ${s.last_name_th} ${s.student_code}`.toLowerCase();
      if (!full.includes(q)) return false;
    }
    return true;
  });

  const togglePickerStudent = (code) => {
    setPickerSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
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
            จัดการรายชื่อชุมนุมและสมาชิกที่นี่ — ทุกชุมนุมจัดกิจกรรมวัน/คาบเดียวกันตามที่ตั้งไว้ด้านล่าง
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-bold text-gray-900 mb-0.5">⚙️ ตั้งค่ากลางของชุมนุม (ทั้งโรงเรียน)</p>
            <p className="text-xs text-gray-400">
              ทุกชุมนุมจัดกิจกรรมวัน/คาบเดียวกัน และเปิด-ปิดรับสมัครพร้อมกันตามช่วงเวลานี้อัตโนมัติ
            </p>
          </div>
          {scheduleConfig && (
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                scheduleConfig.is_registration_open
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}
            >
              {scheduleConfig.is_registration_open ? '🔓 กำลังเปิดรับสมัคร' : '🔒 ปิดรับสมัครอยู่'}
            </span>
          )}
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>วันจัดกิจกรรม</span>
            <select
              className={`${inputCls} py-2`}
              value={scheduleForm.day_of_week}
              onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: Number(e.target.value) })}
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>คาบ</span>
            <select
              className={`${inputCls} py-2`}
              value={scheduleForm.period}
              onChange={(e) => setScheduleForm({ ...scheduleForm, period: Number(e.target.value) })}
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p} value={p}>คาบ {p}</option>
              ))}
            </select>
          </label>
          {/* สวิตช์เปิดใช้ช่วงเวลาลงทะเบียน */}
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>เปิดรับสมัคร</span>
            <button
              type="button"
              onClick={() => setRegEnabled((v) => !v)}
              className={`relative w-[52px] h-[28px] rounded-full transition-colors border-none cursor-pointer ${
                regEnabled ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
              aria-pressed={regEnabled}
            >
              <span
                className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-transform ${
                  regEnabled ? 'translate-x-[24px]' : ''
                }`}
              />
            </button>
          </label>

          {regEnabled && (
            <>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                <span>เริ่มลงทะเบียน</span>
                <input
                  type="datetime-local"
                  className={`${inputCls} py-2`}
                  value={scheduleForm.registration_start}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, registration_start: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                <span>สิ้นสุดลงทะเบียน</span>
                <input
                  type="datetime-local"
                  className={`${inputCls} py-2`}
                  value={scheduleForm.registration_end}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, registration_end: e.target.value })}
                />
              </label>
            </>
          )}
          <button
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60"
            onClick={handleSaveScheduleConfig}
            disabled={scheduleSaving}
          >
            {scheduleSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
        {!regEnabled && (
          <p className="text-xs text-gray-400 mt-1">
            ปิดรับสมัครทั้งหมด — เปิดสวิตช์แล้วตั้งช่วงเวลาเพื่อให้นักเรียนสมัครได้
          </p>
        )}
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
                className="h-[110px] relative flex items-center justify-center bg-cover bg-center"
                style={{
                  background: club.image_url
                    ? `url(${clubAPI.resolveImageUrl(club.image_url)}) center/cover`
                    : 'linear-gradient(135deg, #6366F1, #6366F1b3)',
                }}
              >
                {!club.image_url && <span className="text-[32px] opacity-85">🎭</span>}
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

              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-gray-800 text-sm">รูปปกชุมนุม</span>
                {form.image_url ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={clubAPI.resolveImageUrl(form.image_url)}
                      alt="preview"
                      className="w-full h-[140px] object-cover block"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold border border-red-100 cursor-pointer"
                      onClick={() => setForm({ ...form, image_url: null })}
                    >
                      ลบรูป
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-8 px-5 text-center text-gray-400 text-sm">
                    ไม่มีรูปภาพ
                  </div>
                )}
                <label className="inline-block bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-center cursor-pointer font-semibold text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  {uploading ? 'กำลังอัปโหลด...' : form.image_url ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ'}
                  <input type="file" accept="image/*" onChange={handleUploadImage} disabled={uploading} hidden />
                </label>
              </div>

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

              {form.advisor_teacher_code && (
                <p className="text-xs text-gray-400">
                  ระบบจะเช็คให้อัตโนมัติว่าครูที่ปรึกษาว่างในคาบกิจกรรมชุมนุมกลางหรือไม่ตอนบันทึก
                </p>
              )}

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openPicker}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer"
                >
                  + เพิ่มนักเรียน
                </button>
                <button
                  type="button"
                  onClick={closeMembers}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none bg-transparent border-none cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {membersLoading ? (
                <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีสมาชิก — กด "เพิ่มนักเรียน" เพื่อเพิ่มเอง</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-gray-500">
                        <th className="p-3 font-semibold">ชื่อนักเรียน</th>
                        <th className="p-3 font-semibold">รหัสนักเรียน</th>
                        <th className="p-3 font-semibold">ชั้น/ห้อง</th>
                        <th className="p-3 font-semibold">วันที่เข้าร่วม</th>
                        <th className="p-3 font-semibold text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-gray-50 last:border-none">
                          <td className="p-3 text-gray-800">
                            {m.student_name || (allStudents.length > 0 ? studentName(m.student_code) : m.student_code)}
                          </td>
                          <td className="p-3 text-gray-500">{m.student_code}</td>
                          <td className="p-3 text-gray-500">
                            {m.grade ? `${m.grade}/${m.section}` : '-'}
                          </td>
                          <td className="p-3 text-gray-500">
                            {m.joined_at ? new Date(m.joined_at).toLocaleDateString('th-TH') : '-'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.student_code)}
                              className="text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-semibold border-none bg-transparent cursor-pointer"
                            >
                              ลบออก
                            </button>
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

      {/* Modal เลือกนักเรียนเพิ่มเข้าชุมนุม */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => !addingMembers && setShowPicker(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">เพิ่มนักเรียนเข้าชุมนุม</h3>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-100 flex gap-2">
              <select
                className={`${inputCls} py-2 flex-1`}
                value={pickerRoom}
                onChange={(e) => setPickerRoom(e.target.value)}
              >
                <option value="">ทุกห้อง</option>
                {roomOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                type="text"
                className={`${inputCls} py-2 flex-1`}
                placeholder="ค้นหาชื่อ/รหัส"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3">
              {studentsLoading ? (
                <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลดรายชื่อนักเรียน...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">ไม่พบนักเรียน (หรือเป็นสมาชิกครบแล้ว)</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredStudents.map((s) => {
                    const checked = pickerSelected.includes(s.student_code);
                    return (
                      <label
                        key={s.student_code}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                          checked ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer"
                          checked={checked}
                          onChange={() => togglePickerStudent(s.student_code)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 truncate">
                            {s.title_th || ''}{s.first_name_th} {s.last_name_th}
                          </div>
                          <div className="text-xs text-gray-400">
                            {s.student_code} · {s.grade}/{s.section}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">เลือกแล้ว {pickerSelected.length} คน</span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60"
                  onClick={() => setShowPicker(false)}
                  disabled={addingMembers}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer disabled:opacity-60"
                  onClick={handleAddMembers}
                  disabled={addingMembers || pickerSelected.length === 0}
                >
                  {addingMembers ? 'กำลังเพิ่ม...' : `เพิ่ม ${pickerSelected.length} คน`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubManagement;
