'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../api/personnelApi';
import { behaviorAPI } from '../api/behaviorApi';
import { getToken, API_CONFIG } from '../api/config';
import { gradesAPI } from '../api/gradesApi';
import { getStudentName, getClassName } from '../utils/studentHelpers';

// ---- image helpers (same pattern as StudentDetailModal) ----
const PROFILE_KEY = (code) => `profile_image_url_${code}`;

const fetchImageAsBlobUrl = async (url) => {
  const token = getToken();
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

// ---- attendance API (attendance-service) ----
const ATTENDANCE_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.klasaapp.com';

const fetchStudentAttendance = async (studentCode, token) => {
  const res = await fetch(
    `${ATTENDANCE_BASE}/api/student/attendance?student_id=${studentCode}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  if (!res.ok) return null;
  return res.json();
};


const normalizeGradeTerms = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const list = Array.isArray(raw) ? raw : raw.terms || raw.data || raw.grades || [];
  if (!list.length) return null;
  return list.map((term) => ({
    semester: String(term.semester || term.term || ''),
    academicYear: String(term.academic_year || term.academicYear || ''),
    subjects: (term.subjects || term.subject_grades || []).map((sub) => ({
      name: sub.subject_name || sub.name || '',
      grade: parseFloat(sub.grade ?? sub.score ?? 0),
    })),
  }));
};

const gradeColor = (g) => {
  if (g >= 3.5) return '#2e7d32';
  if (g >= 3.0) return '#1565c0';
  if (g >= 2.0) return '#f57f17';
  return '#c62828';
};

const statusLabel = (s) => {
  const map = { present: 'มาเรียน', absent: 'ขาด', late: 'มาสาย', leave: 'ลา', sick: 'ป่วย' };
  return map[s] || s;
};
const statusClass = (s) => s || 'present';

// Status dot color map
const STATUS_DOT_COLOR = {
  present: 'bg-[#4caf50]',
  absent: 'bg-[#f44336]',
  late: 'bg-[#ff9800]',
  leave: 'bg-[#2196f3]',
  sick: 'bg-[#9c27b0]',
};

// Status chip classes
const STATUS_CHIP_CLASSES = {
  present: 'bg-[#e8f5e9] text-[#2e7d32]',
  absent: 'bg-[#ffebee] text-[#c62828]',
  late: 'bg-[#fff3e0] text-[#e65100]',
  leave: 'bg-[#e3f2fd] text-[#1565c0]',
  sick: 'bg-[#f3e5f5] text-[#6a1b9a]',
};

const TABS = [
  { key: 'general', label: 'ข้อมูลทั่วไป' },
  { key: 'attendance', label: 'การเข้าเรียน' },
  { key: 'grades', label: 'ผลการเรียน' },
];

const StudentReportDrawer = ({ student, onClose }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [profileBlobUrl, setProfileBlobUrl] = useState(null);
  const [detail, setDetail] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const code = student?.student_code || student?.studentCode;

  // load profile image from localStorage cache
  useEffect(() => {
    if (!code) return;
    const cachedUrl = localStorage.getItem(PROFILE_KEY(code));
    if (!cachedUrl) return;
    let cancelled = false;
    fetchImageAsBlobUrl(cachedUrl).then((blobUrl) => {
      if (cancelled) { if (blobUrl) URL.revokeObjectURL(blobUrl); return; }
      setProfileBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return blobUrl; });
    });
    return () => { cancelled = true; };
  }, [code]);

  // cleanup blob on unmount
  useEffect(() => {
    return () => { setProfileBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; }); };
  }, []);

  // load full student detail
  useEffect(() => {
    if (!student?.id) return;
    setLoadingDetail(true);
    studentAPI.getStudent(student.id, token)
      .then((res) => setDetail(res?.data || res || null))
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [student?.id, token]);

  // load attendance when tab active
  useEffect(() => {
    if (activeTab !== 'attendance' || !code || attendanceData !== null) return;
    setLoadingAttendance(true);
    fetchStudentAttendance(code, token)
      .then((res) => setAttendanceData(res || null))
      .catch(() => setAttendanceData(null))
      .finally(() => setLoadingAttendance(false));
  }, [activeTab, code, token]);

  // load grades when tab active
  useEffect(() => {
    if (activeTab !== 'grades' || !code || gradesData !== null) return;
    setLoadingGrades(true);
    gradesAPI.getStudentGrades(code, token)
      .then((res) => {
        const normalized = normalizeGradeTerms(res);
        setGradesData(normalized || []);
      })
      .catch(() => setGradesData([]))
      .finally(() => setLoadingGrades(false));
  }, [activeTab, code, token]);

  const info = detail || student;
  const name = getStudentName(info) || '-';
  const cn = getClassName(info) || '-';
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const summary = attendanceData?.summary || {};
  const subjectStats = attendanceData?.subject_stats || [];
  const history = (attendanceData?.history || []).slice(0, 30);

  return (
    /* Overlay */
    <div
      className="fixed inset-0 bg-black/45 z-[500] flex justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Drawer — slides in from right */}
      <div
        className="w-[520px] max-w-full h-screen bg-white flex flex-col shadow-2xl overflow-hidden"
        style={{ animation: 'slideIn 0.22s ease' }}
      >
        {/* Header — purple gradient */}
        <div className="flex items-center gap-4 px-5 pt-6 pb-5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          {/* Avatar */}
          <div className="w-[72px] h-[72px] shrink-0">
            {profileBlobUrl ? (
              <img
                src={profileBlobUrl}
                alt={name}
                className="w-[72px] h-[72px] rounded-full object-cover border-[3px] border-white/60"
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-white/25 border-[3px] border-white/50 flex items-center justify-center text-[26px] font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="m-0 mb-2 text-[20px] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">{name}</h2>
            <div className="flex gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-[20px] text-xs font-semibold bg-white/25 text-white">{cn}</span>
              <span className="px-2.5 py-0.5 rounded-[20px] text-xs font-semibold bg-white/25 text-white">{code || '-'}</span>
              {(student?.attendance_rate ?? null) !== null && (
                <span className={`px-2.5 py-0.5 rounded-[20px] text-xs font-semibold text-white ${
                  student.attendance_rate < 70 ? 'bg-[#e53935]' : student.attendance_rate < 80 ? 'bg-[#fb8c00]' : 'bg-[#43a047]'
                }`}>
                  เข้าเรียน {student.attendance_rate}%
                </span>
              )}
            </div>
          </div>
          {/* Close */}
          <button
            className="bg-white/20 border-none text-white text-[18px] w-9 h-9 rounded-full cursor-pointer flex items-center justify-center shrink-0 self-start transition-colors hover:bg-white/35"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#eee] shrink-0 bg-white">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`flex-1 py-3.5 px-2 bg-transparent border-none border-b-[3px] text-sm font-medium cursor-pointer transition-all -mb-0.5 ${
                activeTab === t.key
                  ? 'text-[#2563eb] border-b-[#2563eb] font-bold'
                  : 'text-[#757575] border-b-transparent hover:text-[#2563eb]'
              }`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#f8f9ff]">
          {/* ---- TAB: ข้อมูลทั่วไป ---- */}
          {activeTab === 'general' && (
            loadingDetail ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-[#9e9e9e] gap-3 text-sm">
                <div className="w-9 h-9 border-4 border-[#e0e0e0] border-t-[#2563eb] rounded-full"
                  style={{ animation: 'spin 0.8s linear infinite' }} />
                <p>กำลังโหลด...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Section title="ข้อมูลนักเรียน">
                  <Row label="ชื่อ-นามสกุล" value={name} />
                  <Row label="รหัสนักเรียน" value={info?.student_code || info?.studentCode} mono />
                  <Row label="ห้องเรียน" value={cn} />
                  <Row label="เลขที่" value={info?.student_number} />
                  <Row label="วันเกิด" value={info?.date_of_birth || info?.birth_date ? new Date(info.date_of_birth || info.birth_date).toLocaleDateString('th-TH') : null} />
                  <Row label="เพศ" value={info?.gender === 'male' ? 'ชาย' : info?.gender === 'female' ? 'หญิง' : info?.gender} />
                  <Row label="เชื้อชาติ" value={info?.nationality} />
                  <Row label="ศาสนา" value={info?.religion} />
                  <Row label="หมู่เลือด" value={info?.blood_type} />
                  <Row label="น้ำหนัก" value={info?.weight ? `${info.weight} กก.` : null} />
                  <Row label="ส่วนสูง" value={info?.height ? `${info.height} ซม.` : null} />
                </Section>
                <Section title="ที่อยู่">
                  <Row label="ที่อยู่" value={info?.address} />
                  <Row label="ตำบล" value={info?.sub_district || info?.subdistrict} />
                  <Row label="อำเภอ" value={info?.district} />
                  <Row label="จังหวัด" value={info?.province} />
                  <Row label="รหัสไปรษณีย์" value={info?.postal_code} />
                </Section>
                <Section title="ผู้ปกครอง">
                  <Row label="ชื่อบิดา" value={info?.father_name || (info?.father_first_name ? `${info.father_first_name} ${info.father_last_name || ''}`.trim() : null)} />
                  <Row label="อาชีพบิดา" value={info?.father_occupation} />
                  <Row label="เบอร์บิดา" value={info?.father_phone} />
                  <Row label="ชื่อมารดา" value={info?.mother_name || (info?.mother_first_name ? `${info.mother_first_name} ${info.mother_last_name || ''}`.trim() : null)} />
                  <Row label="อาชีพมารดา" value={info?.mother_occupation} />
                  <Row label="เบอร์มารดา" value={info?.mother_phone} />
                  <Row label="ชื่อผู้ปกครอง" value={info?.guardian_name || (info?.guardian_first_name ? `${info.guardian_first_name} ${info.guardian_last_name || ''}`.trim() : null)} />
                  <Row label="เบอร์ผู้ปกครอง" value={info?.guardian_phone} />
                </Section>
              </div>
            )
          )}

          {/* ---- TAB: การเข้าเรียน ---- */}
          {activeTab === 'attendance' && (
            loadingAttendance ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-[#9e9e9e] gap-3 text-sm">
                <div className="w-9 h-9 border-4 border-[#e0e0e0] border-t-[#2563eb] rounded-full"
                  style={{ animation: 'spin 0.8s linear infinite' }} />
                <p>กำลังโหลดข้อมูลการเข้าเรียน...</p>
              </div>
            ) : !attendanceData ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-[#9e9e9e] gap-3 text-sm">
                <span className="text-[40px]">📭</span>
                <p>ไม่พบข้อมูลการเข้าเรียน</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Summary chips — 5 columns */}
                <div className="grid grid-cols-5 gap-2">
                  <AttChip label="มาเรียน" value={summary.present ?? 0} color="#4caf50" />
                  <AttChip label="ขาด" value={summary.absent ?? 0} color="#f44336" />
                  <AttChip label="มาสาย" value={summary.late ?? 0} color="#ff9800" />
                  <AttChip label="ลา" value={summary.leave ?? 0} color="#2196f3" />
                  <AttChip label="ป่วย" value={summary.sick ?? 0} color="#9c27b0" />
                </div>

                {/* Overall rate bar */}
                {attendanceData.attendance_rate !== undefined && (
                  <div className="bg-white rounded-xl border border-[#eee] p-4">
                    <div className="flex justify-between text-sm text-[#555] mb-2">
                      <span>อัตราการเข้าเรียนรวม</span>
                      <span style={{ fontWeight: 700, color: attendanceData.attendance_rate >= 80 ? '#2e7d32' : attendanceData.attendance_rate >= 70 ? '#e65100' : '#c62828' }}>
                        {Math.round(attendanceData.attendance_rate)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-500 ease-in-out"
                        style={{
                          width: `${Math.min(attendanceData.attendance_rate, 100)}%`,
                          background: attendanceData.attendance_rate >= 80 ? '#4caf50' : attendanceData.attendance_rate >= 70 ? '#ff9800' : '#f44336',
                        }}
                      />
                    </div>
                    {attendanceData.attendance_rate < 70 && (
                      <div className="mt-2.5 px-3 py-2 bg-[#ffebee] rounded-lg text-[13px] text-[#c62828] font-semibold">
                        ⚠️ ไม่มีสิทธิสอบ (ต้องการ ≥70%)
                      </div>
                    )}
                  </div>
                )}

                {/* Per-subject stats */}
                {subjectStats.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#eee] p-4">
                    <h4 className="m-0 mb-3 text-[13px] font-bold text-[#555] uppercase tracking-[0.5px]">รายวิชา</h4>
                    {subjectStats.map((sub, i) => (
                      <div className="flex items-center gap-2.5 py-2 border-b border-[#f5f5f5] last:border-b-0" key={i}>
                        <div className="text-[13px] font-medium text-[#333] min-w-[120px] flex-1">{sub.subject_name}</div>
                        <div className="flex gap-1 flex-wrap">
                          <span className="text-[11px] px-[7px] py-0.5 rounded-[10px] bg-[#e8f5e9] text-[#2e7d32]">{sub.present_count} มา</span>
                          <span className="text-[11px] px-[7px] py-0.5 rounded-[10px] bg-[#ffebee] text-[#c62828]">{sub.absent_count} ขาด</span>
                          <span className="text-[11px] px-[7px] py-0.5 rounded-[10px] bg-[#e3f2fd] text-[#1565c0]">{sub.leave_count} ลา</span>
                          <span className="text-[11px] px-[7px] py-0.5 rounded-[10px] bg-[#fff3e0] text-[#e65100]">{sub.late_count} สาย</span>
                        </div>
                        <div className="text-sm font-bold min-w-[40px] text-right" style={{ color: sub.attendance_rate >= 80 ? '#2e7d32' : sub.attendance_rate >= 70 ? '#e65100' : '#c62828' }}>
                          {Math.round(sub.attendance_rate)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* History */}
                {history.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#eee] p-4">
                    <h4 className="m-0 mb-3 text-[13px] font-bold text-[#555] uppercase tracking-[0.5px]">ประวัติล่าสุด (30 รายการ)</h4>
                    <div className="flex flex-col gap-0.5">
                      {history.map((h, i) => (
                        <div className="flex items-center gap-2.5 py-2 border-b border-[#f5f5f5] last:border-b-0" key={i}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLOR[statusClass(h.status)] || 'bg-[#4caf50]'}`} />
                          <div className="flex-1 min-w-0">
                            <span className="block text-[13px] font-medium text-[#333] whitespace-nowrap overflow-hidden text-ellipsis">{h.subject_name || h.subject}</span>
                            <span className="block text-[11px] text-[#9e9e9e] mt-0.5">{h.date} {h.time}</span>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-xl font-medium shrink-0 ${STATUS_CHIP_CLASSES[statusClass(h.status)] || STATUS_CHIP_CLASSES.present}`}>
                            {statusLabel(h.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ---- TAB: ผลการเรียน ---- */}
          {activeTab === 'grades' && (
            loadingGrades ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-[#9e9e9e] gap-3 text-sm">
                <div className="w-9 h-9 border-4 border-[#e0e0e0] border-t-[#2563eb] rounded-full"
                  style={{ animation: 'spin 0.8s linear infinite' }} />
                <p>กำลังโหลดผลการเรียน...</p>
              </div>
            ) : !gradesData || gradesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-[#9e9e9e] gap-3 text-sm">
                <span className="text-[40px]">📭</span>
                <p>ยังไม่มีข้อมูลผลการเรียน</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* GPA Summary */}
                <GpaSummaryBar terms={gradesData} />

                {/* Per-term cards */}
                {gradesData.map((term, ti) => {
                  const validSubs = term.subjects.filter((s) => s.grade > 0);
                  const gpa = validSubs.length
                    ? (validSubs.reduce((acc, s) => acc + s.grade, 0) / validSubs.length).toFixed(2)
                    : '0.00';
                  return (
                    <div className="bg-white rounded-xl border border-[#eee] overflow-hidden" key={ti}>
                      <div className="flex justify-between items-center px-4 py-3.5 bg-[#f8f9ff] border-b border-[#eee]">
                        <span className="text-sm font-semibold text-[#424242]">
                          ภาคเรียนที่ {term.semester} / {term.academicYear}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9e9e9e]">GPA</span>
                          <span className="text-base font-bold" style={{ color: gradeColor(parseFloat(gpa)) }}>{gpa}</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-2.5">
                        {term.subjects.map((sub, si) => (
                          <div className="flex items-center gap-2.5" key={si}>
                            <span className="text-[13px] text-[#424242] min-w-[130px] shrink-0 truncate">{sub.name}</span>
                            <div className="flex-1">
                              <div className="h-2 bg-[#f0f0f0] rounded overflow-hidden">
                                <div
                                  className="h-full rounded transition-[width] duration-500 ease-in-out"
                                  style={{ width: `${(sub.grade / 4) * 100}%`, background: gradeColor(sub.grade) }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-bold min-w-[34px] text-right" style={{ color: gradeColor(sub.grade) }}>
                              {sub.grade > 0 ? sub.grade.toFixed(1) : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ---- GPA summary bar across all terms ----
const GpaSummaryBar = ({ terms }) => {
  const points = terms.map((term) => {
    const valid = term.subjects.filter((s) => s.grade > 0);
    return {
      label: `ต.${term.semester}/${term.academicYear.slice(-2)}`,
      gpa: valid.length ? valid.reduce((a, s) => a + s.grade, 0) / valid.length : 0,
    };
  });
  const overall = points.length
    ? (points.reduce((a, p) => a + p.gpa, 0) / points.length).toFixed(2)
    : '0.00';
  return (
    <div className="bg-white rounded-xl border border-[#eee] p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[13px] font-bold text-[#555] uppercase tracking-[0.5px]">GPA สะสม</span>
        <span className="text-xl font-bold" style={{ color: gradeColor(parseFloat(overall)) }}>{overall}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {points.map((p, i) => (
          <div key={i} className="flex flex-col items-center gap-1 bg-[#f8f9ff] rounded-lg px-3 py-2 min-w-[60px]">
            <span className="text-sm font-bold" style={{ color: gradeColor(p.gpa) }}>{p.gpa.toFixed(2)}</span>
            <span className="text-[10px] text-[#9e9e9e]">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- small helper components ----
const Section = ({ title, children }) => {
  const rows = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  const visible = rows.filter((r) => r?.props?.value);
  if (!visible.length) return null;
  return (
    <div className="bg-white rounded-xl border border-[#eee] overflow-hidden">
      <div className="px-4 py-3 text-xs font-bold text-[#2563eb] uppercase tracking-[0.5px] bg-[#f8f9ff] border-b border-[#eee]">{title}</div>
      <div>{rows}</div>
    </div>
  );
};

const Row = ({ label, value, mono }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#f5f5f5] last:border-b-0 gap-3">
      <span className="text-[13px] text-[#757575] shrink-0 min-w-[110px]">{label}</span>
      <span className={`text-sm text-[#212121] font-medium text-right break-words ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</span>
    </div>
  );
};

const AttChip = ({ label, value, color }) => (
  <div className="bg-white border-2 rounded-[10px] px-1.5 py-2.5 text-center flex flex-col gap-1" style={{ borderColor: color }}>
    <span className="text-[22px] font-bold" style={{ color }}>{value}</span>
    <span className="text-[11px] text-[#757575]">{label}</span>
  </div>
);

export default StudentReportDrawer;
