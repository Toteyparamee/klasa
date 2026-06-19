'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchoolId } from '../hooks/useSchoolId';
import { studentAPI } from '../api/personnelApi';
import { behaviorAPI } from '../api/behaviorApi';
import { academicAPI } from '../api/academicApi';
import StudentReportDrawer from './StudentReportDrawer';
import { getToken, API_CONFIG } from '../api/config';
import { gradesAPI } from '../api/gradesApi';
import { scheduleAPI } from '../api/scheduleApi';
import { teacherAPI } from '../api/personnelApi';
import { getSemesterSettings, getCurrentSemester } from '../api/settingsApi';
import { getStudentName, getClassName } from '../utils/studentHelpers';

// fetch profile image blob (same pattern as StudentDetailModal)
const PROFILE_KEY = (code) => `profile_image_url_${code}`;
const fetchBlobUrl = async (url) => {
  const token = getToken();
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch { return null; }
};

const ACADEMIC_YEAR = '2568';
const SEMESTERS = [
  { value: '1', label: 'ภาคเรียนที่ 1' },
  { value: '2', label: 'ภาคเรียนที่ 2' },
];

const getRateBadgeClass = (rate) => {
  if (rate >= 80) return 'excellent';
  if (rate >= 70) return 'good';
  return 'warning';
};

// Tailwind class maps for rate badges
const RATE_BADGE_CLASSES = {
  excellent: 'bg-green-50 text-green-700',
  good: 'bg-orange-50 text-orange-700',
  warning: 'bg-red-50 text-red-700',
};

const PAGE_TABS = [
  { key: 'overview', label: '📊 ภาพรวม' },
  { key: 'grades', label: '✏️ กรอกเกรด' },
];

const GRADE_OPTIONS = [
  { value: '', label: '—' },
  { value: '4.0', label: '4.0' },
  { value: '3.5', label: '3.5' },
  { value: '3.0', label: '3.0' },
  { value: '2.5', label: '2.5' },
  { value: '2.0', label: '2.0' },
  { value: '1.5', label: '1.5' },
  { value: '1.0', label: '1.0' },
  { value: '0.0', label: '0.0' },
];

const AcademicReport = () => {
  const { token } = useAuth();
  const schoolId = useSchoolId();

  const [pageTab, setPageTab] = useState('overview');
  const [semester, setSemester] = useState('2');
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEAR);
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [semesterOptions, setSemesterOptions] = useState([]);
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [settingsReady, setSettingsReady] = useState(false);

  const [students, setStudents] = useState([]);
  const [behaviorData, setBehaviorData] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // grade input state — subjects และ inputs โหลดจาก grades API
  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [gradeInputs, setGradeInputs] = useState({});
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeSaveMsg, setGradeSaveMsg] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  // publish state
  const [publishStatus, setPublishStatus] = useState(null); // { status, published_at, scheduled_at, published_by }
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [publishMsg, setPublishMsg] = useState(null);
  const [publishMode, setPublishMode] = useState('published'); // 'published' | 'scheduled'
  const [scheduledAt, setScheduledAt] = useState(''); // datetime-local string

  // โหลด semester/year options จาก settings API
  useEffect(() => {
    if (!schoolId) return;
    Promise.allSettled([
      getSemesterSettings(schoolId),
      getCurrentSemester(schoolId),
    ]).then(([listRes, currentRes]) => {
      const list = listRes.status === 'fulfilled'
        ? (Array.isArray(listRes.value) ? listRes.value : listRes.value?.data || listRes.value?.semesters || [])
        : [];

      if (list.length) {
        const years = [...new Set(list.map((s) => String(s.academic_year)))].sort((a, b) => b - a);
        const sems = [...new Set(list.map((s) => String(s.semester)))].sort();
        setAcademicYearOptions(years);
        setSemesterOptions(sems);
      }

      if (currentRes.status === 'fulfilled' && currentRes.value) {
        const cur = currentRes.value?.data || currentRes.value;
        if (cur?.academic_year) setAcademicYear(String(cur.academic_year));
        if (cur?.semester) setSemester(String(cur.semester));
      }
      setSettingsReady(true);
    });
  }, [schoolId]);

  useEffect(() => {
    if (!settingsReady) return;
    loadData();
  }, [semester, academicYear, settingsReady]);

  // โหลด publish status เมื่อเปิด tab กรอกเกรด
  useEffect(() => {
    if (pageTab !== 'grades' || !settingsReady || !semester || !academicYear) return;
    setPublishLoading(true);
    setPublishMsg(null);
    gradesAPI.getPublishStatus(semester, academicYear, token)
      .then((res) => {
        const d = res?.data || res;
        setPublishStatus(d);
        if (d?.status === 'scheduled') setPublishMode('scheduled');
        else setPublishMode('published');
        if (d?.scheduled_at) {
          // แปลง ISO → datetime-local (YYYY-MM-DDTHH:mm)
          const dt = new Date(d.scheduled_at);
          const pad = (n) => String(n).padStart(2, '0');
          setScheduledAt(`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
        } else {
          setScheduledAt('');
        }
      })
      .catch(() => setPublishStatus(null))
      .finally(() => setPublishLoading(false));
  }, [pageTab, semester, academicYear, settingsReady]);

  // โหลด subjects + grades เมื่อเปิด tab กรอกเกรด และเลือกห้องแล้ว
  useEffect(() => {
    if (pageTab !== 'grades' || !settingsReady) return;
    if (!selectedClass) { setGradeSubjects([]); setGradeInputs({}); return; }

    // นักเรียนในห้องที่เลือก
    const classStudents = students.filter((s) => getClassName(s) === selectedClass);
    if (!classStudents.length) return;

    const codes = classStudents.map((s) => s.student_code || s.studentCode).filter(Boolean);
    const classId = classStudents[0]?.class_id ?? classStudents[0]?.class?.id;

    setGradeLoading(true);
    setGradeSaveMsg(null);

    Promise.allSettled([
      gradesAPI.getGradesBatch(codes, semester, academicYear, token),
      classId
        ? scheduleAPI.getSchedulesByClass(classId, { semester, academicYear }, token)
        : Promise.resolve(null),
      teacherAPI.getTeachers(token),
    ]).then(([gradesRes, scheduleRes, teachersRes]) => {
      const gradeMap = gradesRes.status === 'fulfilled' ? (gradesRes.value || {}) : {};

      // build teacher_code -> display name map
      const teacherNameMap = new Map();
      if (teachersRes.status === 'fulfilled' && teachersRes.value) {
        const tList = Array.isArray(teachersRes.value) ? teachersRes.value : (teachersRes.value?.data ?? []);
        tList.forEach((t) => {
          if (t.teacher_code) {
            const title = t.title_th ? `${t.title_th}` : '';
            const name = `${title}${t.first_name_th || ''}${t.last_name_th ? ` ${t.last_name_th}` : ''}`.trim();
            teacherNameMap.set(t.teacher_code, name || t.teacher_code);
          }
        });
      }

      // subjects จาก schedule ของห้องนี้
      // API returns { success, data: [...], total } so we read .data
      const subjectMap = new Map(); // key = subject_name, value = { name, code, teacher, credits }
      if (scheduleRes.status === 'fulfilled' && scheduleRes.value) {
        const raw = scheduleRes.value;
        const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
        list.forEach((sch) => {
          const name = sch.subject?.subject_name || sch.subject_name;
          if (name && !subjectMap.has(name)) {
            const code = sch.subject?.subject_code || sch.subject_code || '';
            const tCode = sch.teacher_code || '';
            const teacher = teacherNameMap.get(tCode) || tCode;
            const credits = sch.subject?.credits ?? null;
            subjectMap.set(name, { name, code, teacher, credits });
          }
        });
      }

      // pre-fill inputs + เพิ่มวิชาจาก grade entries ที่บันทึกไว้
      const inputs = {};
      Object.entries(gradeMap).forEach(([code, subjects]) => {
        subjects.forEach((sub) => {
          if (sub.subject_name && !subjectMap.has(sub.subject_name)) {
            subjectMap.set(sub.subject_name, { name: sub.subject_name, code: '', teacher: '', credits: null });
          }
          if (!inputs[code]) inputs[code] = {};
          inputs[code][sub.subject_name] = sub.grade > 0 ? parseFloat(sub.grade).toFixed(1) : '';
        });
      });

      setGradeSubjects([...subjectMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'th')));
      setGradeInputs(inputs);
    }).finally(() => setGradeLoading(false));
  }, [pageTab, selectedClass, semester, academicYear, students, settingsReady]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, behaviorRes] = await Promise.allSettled([
        studentAPI.getStudents(token),
        behaviorAPI.getAllStudents(token, semester, academicYear),
      ]);

      let loadedStudents = [];
      if (studentsRes.status === 'fulfilled') {
        const raw = studentsRes.value;
        const firstPage = Array.isArray(raw) ? raw : raw?.data || raw?.students || [];
        const total = raw?.meta?.total ?? firstPage.length;
        // ถ้ายังมีหน้าถัดไป ดึงทั้งหมดในครั้งเดียวโดยใช้ limit=total
        if (total > firstPage.length) {
          try {
            const allRes = await studentAPI.getStudentsAll(token, total);
            const allRaw = allRes;
            loadedStudents = Array.isArray(allRaw) ? allRaw : allRaw?.data || allRaw?.students || firstPage;
          } catch {
            loadedStudents = firstPage;
          }
        } else {
          loadedStudents = firstPage;
        }
        setStudents(loadedStudents);
      }
      if (behaviorRes.status === 'fulfilled') {
        const raw = behaviorRes.value;
        setBehaviorData(Array.isArray(raw) ? raw : raw?.data || raw?.students || []);
      }

      // ดึง attendance จาก attendance_api สำหรับทุกนักเรียน
      if (loadedStudents.length) {
        const codes = loadedStudents
          .map((s) => s.student_code || s.studentCode || s.code)
          .filter(Boolean);
        const attMap = await academicAPI.getAllStudentsAttendance(codes, token);
        setAttendanceMap(attMap);
      }
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const behaviorMap = useMemo(() => {
    const map = {};
    behaviorData.forEach((s) => {
      const key = s.student_code || s.studentCode || s.id;
      if (key) map[key] = s;
    });
    return map;
  }, [behaviorData]);

  const enrichedStudents = useMemo(() => {
    return students.map((s) => {
      const code = s.student_code || s.studentCode || s.code;
      const beh = behaviorMap[code] || {};
      const att = attendanceMap[code];
      return {
        ...s,
        behavior_score: beh.score ?? beh.behavior_score ?? null,
        attendance_rate: att?.attendance_rate ?? beh.attendance_rate ?? null,
      };
    });
  }, [students, behaviorMap, attendanceMap]);

  const uniqueClasses = useMemo(() => {
    const seen = new Set();
    const list = [];
    enrichedStudents.forEach((s) => {
      const cn = getClassName(s);
      if (cn && !seen.has(cn)) {
        seen.add(cn);
        list.push(cn);
      }
    });
    return list.sort();
  }, [enrichedStudents]);

  const filteredStudents = useMemo(() => {
    return enrichedStudents
      .filter((s) => {
        const name = (getStudentName(s) || '').toLowerCase();
        const code = (s.student_code || s.studentCode || '').toLowerCase();
        const cn = getClassName(s) || '';
        const matchSearch =
          !searchText ||
          name.includes(searchText.toLowerCase()) ||
          code.includes(searchText.toLowerCase());
        const matchClass = !selectedClass || cn === selectedClass;
        return matchSearch && matchClass;
      })
      .sort((a, b) => (a.attendance_rate ?? 101) - (b.attendance_rate ?? 101));
  }, [enrichedStudents, searchText, selectedClass]);

  const overallStats = useMemo(() => {
    if (!enrichedStudents.length) return { total: 0, avgRate: null, goodCount: 0, riskCount: 0 };
    const total = enrichedStudents.length;
    const withRate = enrichedStudents.filter((s) => s.attendance_rate !== null);
    const avgRate = withRate.length
      ? Math.round(withRate.reduce((sum, s) => sum + s.attendance_rate, 0) / withRate.length)
      : null;
    const goodCount = withRate.filter((s) => s.attendance_rate >= 80).length;
    const riskCount = withRate.filter((s) => s.attendance_rate < 70).length;
    return { total, avgRate, goodCount, riskCount };
  }, [enrichedStudents]);

  const setGrade = useCallback((studentCode, subject, value) => {
    setGradeInputs((prev) => ({
      ...prev,
      [studentCode]: { ...(prev[studentCode] || {}), [subject]: value },
    }));
  }, []);

  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name || gradeSubjects.some((s) => s.name === name)) return;
    setGradeSubjects((prev) => [...prev, { name, code: '', teacher: '' }]);
    setNewSubjectName('');
  };

  const removeSubject = (name) => {
    setGradeSubjects((prev) => prev.filter((s) => s.name !== name));
    setGradeInputs((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { const copy = { ...next[k] }; delete copy[name]; next[k] = copy; });
      return next;
    });
  };

  const saveGrades = async () => {
    const entries = [];
    // build map subject_name -> credits จาก gradeSubjects
    const creditsMap = Object.fromEntries(gradeSubjects.map((s) => [s.name, s.credits ?? 0]));
    Object.entries(gradeInputs).forEach(([studentCode, subjects]) => {
      Object.entries(subjects).forEach(([subject, grade]) => {
        if (grade !== '') entries.push({
          student_code: studentCode,
          subject_name: subject,
          grade: parseFloat(grade),
          credits: creditsMap[subject] ?? 0,
          semester: parseInt(semester, 10),
          academic_year: academicYear,
        });
      });
    });
    if (!entries.length) { setGradeSaveMsg({ type: 'warn', text: 'ยังไม่มีเกรดที่กรอก' }); return; }
    setGradeSaving(true);
    setGradeSaveMsg(null);
    try {
      await gradesAPI.bulkUpsertGrades(entries, token);
      setGradeSaveMsg({ type: 'ok', text: `บันทึกแล้ว ${entries.length} รายการ` });
    } catch {
      setGradeSaveMsg({ type: 'err', text: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' });
    } finally {
      setGradeSaving(false);
    }
  };

  const savePublishSettings = async (statusOverride) => {
    const status = statusOverride ?? publishMode;
    if (status === 'scheduled' && !scheduledAt) {
      setPublishMsg({ type: 'warn', text: 'กรุณาเลือกวันและเวลาที่ต้องการเผยแพร่' });
      return;
    }
    setPublishSaving(true);
    setPublishMsg(null);
    try {
      // แปลง datetime-local → ISO8601 พร้อม timezone
      const isoScheduledAt = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
      const res = await gradesAPI.setPublishSettings(
        { semester, academicYear, status, scheduledAt: status === 'scheduled' ? isoScheduledAt : undefined },
        token
      );
      const d = res?.data || res;
      setPublishStatus(d);
      const msgs = { published: 'เผยแพร่เกรดเรียบร้อยแล้ว', scheduled: 'ตั้งเวลาเผยแพร่เรียบร้อยแล้ว', draft: 'ยกเลิกการเผยแพร่แล้ว' };
      setPublishMsg({ type: 'ok', text: msgs[status] || 'บันทึกแล้ว' });
    } catch {
      setPublishMsg({ type: 'err', text: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' });
    } finally {
      setPublishSaving(false);
    }
  };

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileBlobMap, setProfileBlobMap] = useState({});
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const close = () => setExportMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [exportMenuOpen]);

  // โหลด profile images จาก localStorage cache
  useEffect(() => {
    let cancelled = false;
    const created = [];
    Promise.all(
      filteredStudents.map(async (s) => {
        const code = s.student_code || s.studentCode;
        if (!code) return null;
        const cachedUrl = localStorage.getItem(PROFILE_KEY(code));
        if (!cachedUrl) return null;
        const blobUrl = await fetchBlobUrl(cachedUrl);
        if (blobUrl) created.push(blobUrl);
        return [code, blobUrl];
      })
    ).then((entries) => {
      if (cancelled) { created.forEach(URL.revokeObjectURL); return; }
      const map = {};
      entries.forEach((e) => { if (e) map[e[0]] = e[1]; });
      setProfileBlobMap((prev) => {
        Object.values(prev).forEach((u) => u && URL.revokeObjectURL(u));
        return map;
      });
    });
    return () => { cancelled = true; };
  }, [filteredStudents]);

  const exportCSV = (data, suffix) => {
    const rows = [
      ['รหัสนักเรียน', 'ชื่อ-นามสกุล', 'ห้องเรียน', 'อัตราการเข้าเรียน (%)', 'คะแนนพฤติกรรม'],
      ...data.map((s) => [
        s.student_code || s.studentCode || '-',
        getStudentName(s) || '-',
        getClassName(s) || '-',
        s.attendance_rate ?? '-',
        s.behavior_score ?? '-',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายงานวิชาการ_${suffix}_${semester === '1' ? 'ต1' : 'ต2'}_${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const riskStudents = filteredStudents.filter((s) => s.attendance_rate !== null && s.attendance_rate < 70);

  if (loading) {
    return (
      <div className="p-0">
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full mb-4"
            style={{ animation: 'spin 0.8s linear infinite' }} />
          <p>กำลังโหลดข้อมูลรายงานวิชาการ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-0">
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400 text-center">
          <span className="text-[56px] mb-4">⚠️</span>
          <h3 className="m-0 mb-2 text-lg text-gray-500">{error}</h3>
          <p className="m-0 text-sm">กรุณาลองใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 รายงานวิชาการ</h1>
        <p className="text-sm text-gray-500 mt-1">
          ปีการศึกษา {academicYear}{' '}
          {semester === '1' ? 'ภาคเรียนที่ 1' : 'ภาคเรียนที่ 2'}
        </p>
      </div>

      {/* Page Tab */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {PAGE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setPageTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all border-none cursor-pointer ${
              pageTab === t.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'bg-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ======== TAB: กรอกเกรด ======== */}
      {pageTab === 'grades' && (
        <div className="flex flex-col gap-5">
          {/* Grade filter row */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ปีการศึกษา</label>
              <select
                className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white cursor-pointer outline-none min-w-[140px] focus:border-blue-500"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                {(academicYearOptions.length ? academicYearOptions : [ACADEMIC_YEAR]).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ภาคเรียน</label>
              <select
                className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white cursor-pointer outline-none min-w-[160px] focus:border-blue-500"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                {(semesterOptions.length ? semesterOptions : ['1', '2']).map((s) => (
                  <option key={s} value={s}>ภาคเรียนที่ {s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ห้องเรียน</label>
              <select
                className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white cursor-pointer outline-none min-w-[160px] focus:border-blue-500"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">ทุกห้อง</option>
                {uniqueClasses.map((cn) => <option key={cn} value={cn}>{cn}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 ml-auto">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">เพิ่มวิชา</label>
              <div className="flex gap-2">
                <input
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 w-[160px]"
                  placeholder="ชื่อวิชา..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                />
                <button
                  onClick={addSubject}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  + เพิ่ม
                </button>
              </div>
            </div>
          </div>

          {/* Subject chips */}
          <div className="flex gap-2 flex-wrap">
            {gradeSubjects.map((sub) => (
              <span key={sub.name} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-medium">
                {sub.code ? <span className="text-blue-400 text-xs font-mono">{sub.code}</span> : null}
                {sub.name}
                <button
                  onClick={() => removeSubject(sub.name)}
                  className="text-blue-400 hover:text-red-500 bg-transparent border-none cursor-pointer text-base leading-none p-0"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Publish settings card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900">📢 การเผยแพร่ผลการเรียน</span>
                {publishLoading ? (
                  <span className="text-xs text-gray-400">กำลังโหลด...</span>
                ) : publishStatus ? (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-xl ${
                    publishStatus.status === 'published' ? 'bg-green-50 text-green-700' :
                    publishStatus.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {publishStatus.status === 'published' ? '✅ เผยแพร่แล้ว' :
                     publishStatus.status === 'scheduled' ? '⏰ ตั้งเวลาไว้' : '📝 ร่าง'}
                  </span>
                ) : null}
              </div>
              {publishStatus?.status !== 'draft' && publishStatus?.status && (
                <button
                  onClick={() => savePublishSettings('draft')}
                  disabled={publishSaving}
                  className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 bg-transparent cursor-pointer transition-colors disabled:opacity-50"
                >
                  ยกเลิกการเผยแพร่
                </button>
              )}
            </div>

            {/* สถานะปัจจุบัน */}
            {publishStatus?.status === 'published' && publishStatus?.published_at && (
              <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5 mb-4">
                เผยแพร่แล้วเมื่อ {new Date(publishStatus.published_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                {publishStatus.published_by ? ` โดย ${publishStatus.published_by}` : ''}
              </p>
            )}
            {publishStatus?.status === 'scheduled' && publishStatus?.scheduled_at && (
              <p className="text-sm text-blue-700 bg-blue-50 rounded-xl px-4 py-2.5 mb-4">
                จะเผยแพร่อัตโนมัติวันที่ {new Date(publishStatus.scheduled_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}

            {/* ตัวเลือกการเผยแพร่ */}
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">วิธีการเผยแพร่</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPublishMode('published')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors ${
                      publishMode === 'published'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                    }`}
                  >
                    เผยแพร่ทันที
                  </button>
                  <button
                    onClick={() => setPublishMode('scheduled')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors ${
                      publishMode === 'scheduled'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    ตั้งเวลา
                  </button>
                </div>
              </div>

              {publishMode === 'scheduled' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">วันและเวลาที่เผยแพร่</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 cursor-pointer"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide opacity-0">ยืนยัน</label>
                <button
                  onClick={() => savePublishSettings()}
                  disabled={publishSaving || publishLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                >
                  {publishSaving ? 'กำลังบันทึก...' : publishMode === 'scheduled' ? '⏰ ตั้งเวลาเผยแพร่' : '📢 เผยแพร่เกรด'}
                </button>
              </div>

              {publishMsg && (
                <span className={`text-sm font-medium px-3 py-2 rounded-xl self-end ${
                  publishMsg.type === 'ok' ? 'bg-green-50 text-green-700' :
                  publishMsg.type === 'warn' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {publishMsg.text}
                </span>
              )}
            </div>
          </div>

          {/* Grade table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-gray-900">กรอกเกรดนักเรียน</span>
                <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-xl">{filteredStudents.length} คน</span>
                {gradeLoading && (
                  <span className="text-xs text-blue-500 flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-500 rounded-full inline-block" style={{ animation: 'spin 0.8s linear infinite' }} />
                    กำลังโหลดเกรด...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {gradeSaveMsg && (
                  <span className={`text-sm font-medium px-3 py-1.5 rounded-xl ${
                    gradeSaveMsg.type === 'ok' ? 'bg-green-50 text-green-700' :
                    gradeSaveMsg.type === 'warn' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {gradeSaveMsg.text}
                  </span>
                )}
                <button
                  onClick={saveGrades}
                  disabled={gradeSaving || gradeLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                >
                  {gradeSaving ? 'กำลังบันทึก...' : '💾 บันทึกเกรด'}
                </button>
              </div>
            </div>
            {!selectedClass ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-center">
                <span className="text-5xl mb-3">🏫</span>
                <p className="text-sm font-medium text-gray-500">กรุณาเลือกห้องเรียนก่อน</p>
                <p className="text-xs mt-1">วิชาจะแสดงตามตารางสอนของห้องที่เลือก</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-center">
                <span className="text-5xl mb-3">🔍</span>
                <p className="text-sm">ไม่พบนักเรียนในห้องนี้</p>
              </div>
            ) : (
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[200px]">นักเรียน</th>
                    {gradeSubjects.map((sub) => (
                      <th key={sub.name} className="text-center px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">
                        <div>{sub.name}</div>
                        {sub.code && <div className="font-mono text-gray-400 font-normal normal-case tracking-normal mt-0.5">{sub.code}</div>}
                        {sub.credits !== null && sub.credits !== undefined && (
                          <div className="text-blue-500 font-semibold normal-case tracking-normal mt-0.5">{sub.credits} หน่วยกิต</div>
                        )}
                        {sub.teacher && <div className="text-gray-400 font-normal normal-case tracking-normal mt-0.5">{sub.teacher}</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => {
                    const code = s.student_code || s.studentCode || String(idx);
                    const name = getStudentName(s) || '-';
                    const cn = getClassName(s) || '-';
                    return (
                      <tr key={code} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{cn} · {code}</div>
                        </td>
                        {gradeSubjects.map((sub) => (
                          <td key={sub.name} className="px-2 py-3 text-center">
                            <select
                              value={gradeInputs[code]?.[sub.name] ?? ''}
                              onChange={(e) => setGrade(code, sub.name, e.target.value)}
                              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center bg-white outline-none focus:border-blue-400 cursor-pointer w-[72px]"
                            >
                              {GRADE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======== TAB: ภาพรวม ======== */}
      {pageTab === 'overview' && <>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 flex-wrap mb-6">
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ปีการศึกษา</label>
          <select
            className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white cursor-pointer outline-none transition-colors min-w-[140px] focus:border-blue-500"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          >
            {(academicYearOptions.length ? academicYearOptions : [ACADEMIC_YEAR]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ภาคเรียน</label>
          <select
            className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white cursor-pointer outline-none transition-colors min-w-[160px] focus:border-blue-500"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            {(semesterOptions.length ? semesterOptions : ['1', '2']).map((s) => (
              <option key={s} value={s}>ภาคเรียนที่ {s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ห้องเรียน</label>
          <select
            className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white cursor-pointer outline-none transition-colors min-w-[160px] focus:border-blue-500"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">ทุกห้อง</option>
            {uniqueClasses.map((cn) => (
              <option key={cn} value={cn}>
                {cn}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ค้นหา</label>
          <input
            className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white outline-none transition-colors min-w-[220px] focus:border-blue-500"
            type="text"
            placeholder="ชื่อนักเรียน หรือ รหัส..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards — stat card pattern */}
      <div className="grid grid-cols-4 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4 mb-7">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">🎓</div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{overallStats.total}</div>
            <div className="text-sm text-gray-500">นักเรียนทั้งหมด</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl shrink-0">✅</div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{overallStats.goodCount}</div>
            <div className="text-sm text-gray-500">เข้าเรียนดี (≥80%)</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl shrink-0">⚠️</div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{overallStats.riskCount}</div>
            <div className="text-sm text-gray-500">ไม่มีสิทธิสอบ (&lt;70%)</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl shrink-0">📈</div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{overallStats.avgRate !== null ? `${overallStats.avgRate}%` : '—'}</div>
            <div className="text-sm text-gray-500">อัตราเฉลี่ยรวม</div>
          </div>
        </div>
      </div>

      {/* Student Cards */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="m-0 text-base font-semibold text-gray-900">รายชื่อนักเรียน</h3>
            <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-xl">{filteredStudents.length} คน</span>
          </div>
          {/* Export dropdown — absolute positioned */}
          <div className="relative">
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors flex items-center gap-2"
              onClick={() => setExportMenuOpen((v) => !v)}
            >
              ⬇️ ส่งออก CSV ▾
            </button>
            {exportMenuOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 bg-white border border-gray-100 rounded-2xl shadow-lg min-w-[220px] z-[100] overflow-hidden">
                <button
                  className="block w-full px-4 py-3 bg-transparent border-none text-left text-sm text-gray-700 cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => exportCSV(filteredStudents, 'ทั้งหมด')}
                >
                  📋 ทั้งหมด ({filteredStudents.length} คน)
                </button>
                <button
                  className="block w-full px-4 py-3 bg-transparent border-none text-left text-sm text-red-600 cursor-pointer transition-colors hover:bg-red-50 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  onClick={() => exportCSV(riskStudents, 'ไม่มีสิทธิสอบ')}
                  disabled={riskStudents.length === 0}
                >
                  ⚠️ ไม่มีสิทธิสอบ &lt;70% ({riskStudents.length} คน)
                </button>
              </div>
            )}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-400 text-center" style={{ minHeight: 200 }}>
            <span className="text-[56px] mb-4">🔍</span>
            <h3 className="m-0 mb-2 text-lg text-gray-500">ไม่พบข้อมูล</h3>
            <p className="m-0 text-sm">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {filteredStudents.map((s, idx) => {
              const rate = s.attendance_rate;
              const score = s.behavior_score;
              const cn = getClassName(s) || '-';
              const code = s.student_code || s.studentCode || '-';
              const name = getStudentName(s) || '-';
              const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
              const blobUrl = profileBlobMap[s.student_code || s.studentCode];
              const isRisk = rate !== null && rate < 70;
              return (
                <button
                  key={s.id || idx}
                  className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer text-left w-full ${
                    isRisk
                      ? 'border-red-100 bg-red-50/30 hover:border-red-300'
                      : ''
                  }`}
                  onClick={() => setSelectedStudent(s)}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {blobUrl ? (
                      <img src={blobUrl} alt={name} className="w-[52px] h-[52px] rounded-full object-cover border-2 border-gray-200" />
                    ) : (
                      <div className="w-[52px] h-[52px] rounded-full bg-blue-600 flex items-center justify-center text-[18px] font-bold text-white">
                        {initials}
                      </div>
                    )}
                    {isRisk && (
                      <span
                        className="absolute bottom-px right-px w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"
                        title="ไม่มีสิทธิสอบ"
                      />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis mb-1">{name}</div>
                    <div className="flex gap-1.5 items-center">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-medium">{cn}</span>
                      <span className="text-[11px] text-gray-400 font-mono">{code}</span>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex flex-col gap-1.5 items-end shrink-0">
                    <div className="flex flex-col items-end gap-px">
                      <span className={`text-[15px] font-bold px-2 py-0.5 rounded-lg ${rate !== null ? RATE_BADGE_CLASSES[getRateBadgeClass(rate)] : 'bg-gray-50 text-gray-400'}`}>
                        {rate !== null ? `${rate}%` : '—'}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">เข้าเรียน</span>
                    </div>
                    <div className="flex flex-col items-end gap-px">
                      <span className={`text-[15px] font-bold ${score === null ? 'text-gray-400' : score >= 85 ? 'text-green-700' : score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {score ?? '—'}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">พฤติกรรม</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      </>}

      {/* Drawer */}
      {selectedStudent && (
        <StudentReportDrawer
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};

export default AcademicReport;
