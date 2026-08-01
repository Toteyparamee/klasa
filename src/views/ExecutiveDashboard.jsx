'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { attendanceAPI, behaviorAPI } from '../api';
import { studentAPI } from '../api/personnelApi';
import gradesAPI from '../api/gradesApi';
import { getSemesterSettings, getCurrentSemester } from '../api/settingsApi';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { useSchoolId } from '../hooks/useSchoolId';
import { uploadAPI } from '../api/uploadApi';

// เกณฑ์ "เสี่ยง" ที่ตกลงไว้:
// - เช็คชื่อ: อัตรามาเรียนเดือนนี้ < 80%
// - พฤติกรรม: คะแนนสะสม < 50
// - เกรด: มีวิชาที่ได้ 0 (ตก) ตั้งแต่ 1 วิชาขึ้นไป
const ATTENDANCE_THRESHOLD = 80;
const BEHAVIOR_THRESHOLD = 50;

const RISK_TABS = [
  { key: 'attendance', label: '📅 การเช็คชื่อ', color: 'blue' },
  { key: 'behavior', label: '⭐ พฤติกรรม', color: 'orange' },
  { key: 'grades', label: '📝 ผลการเรียน', color: 'red' },
];

// การ์ดโลโก้โรงเรียน — เหมือนกับ AdminDashboard.jsx (โหลดผ่าน blob กัน hotlink)
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

const ExecutiveDashboard = () => {
  const { user, token } = useAuth();
  const schoolId = useSchoolId();
  const { schools } = useSchool();
  const mySchool = schools.find((s) => String(s.id) === String(schoolId));

  const [tab, setTab] = useState('attendance');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [attendanceRisk, setAttendanceRisk] = useState([]);
  const [behaviorRisk, setBehaviorRisk] = useState([]);
  const [gradesRisk, setGradesRisk] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);

    try {
      // หา semester/academic_year ปัจจุบันก่อน — attendance ไม่ต้องใช้
      // (คำนวณจากเดือนนี้เสมอ) แต่ behavior/grades ต้องระบุภาคเรียน
      const [settingsList, current] = await Promise.allSettled([
        getSemesterSettings(schoolId),
        getCurrentSemester(schoolId),
      ]);
      const cur = current.status === 'fulfilled' ? (current.value?.data || current.value) : null;
      const semester = cur?.semester ? String(cur.semester) : '1';
      const academicYear = cur?.academic_year ? String(cur.academic_year) : String(new Date().getFullYear() + 543);

      const [attRes, behRes, studentsRes] = await Promise.allSettled([
        attendanceAPI.getAtRiskAttendance(schoolId, ATTENDANCE_THRESHOLD, token),
        behaviorAPI.getAllStudents(token, semester, academicYear, schoolId),
        studentAPI.getStudentsAll(token, 2000),
      ]);

      // เช็คชื่อ — endpoint คืนเฉพาะคนที่เสี่ยงมาให้แล้ว
      setAttendanceRisk(attRes.status === 'fulfilled' ? attRes.value : []);

      // พฤติกรรม — กรอง current_score < เกณฑ์ เอง
      const behList = behRes.status === 'fulfilled'
        ? (behRes.value?.data || behRes.value || [])
        : [];
      setBehaviorRisk(
        (Array.isArray(behList) ? behList : []).filter((s) => s.current_score < BEHAVIOR_THRESHOLD)
      );

      // เกรด — ต้องมีรายชื่อนักเรียนก่อน ถึงจะ query grades แบบ batch ได้
      const students = studentsRes.status === 'fulfilled'
        ? (Array.isArray(studentsRes.value) ? studentsRes.value : studentsRes.value?.data || [])
        : [];
      setTotalStudents(students.length);
      const codes = students.map((s) => s.student_code).filter(Boolean);

      if (codes.length) {
        const gradeMap = await gradesAPI.getGradesBatch(codes, semester, academicYear, token);
        const studentByCode = new Map(students.map((s) => [s.student_code, s]));
        const failList = [];
        Object.entries(gradeMap || {}).forEach(([code, subjects]) => {
          const failedSubjects = (subjects || []).filter((sub) => sub.grade === 0);
          if (failedSubjects.length === 0) return;
          const info = studentByCode.get(code);
          failList.push({
            student_code: code,
            student_name: info ? `${info.first_name_th || ''} ${info.last_name_th || ''}`.trim() : code,
            classroom: info ? `${info.grade || ''}/${info.section || ''}` : '',
            failed_subjects: failedSubjects.map((s) => s.subject_name),
          });
        });
        setGradesRisk(failList);
      } else {
        setGradesRisk([]);
      }
    } catch (e) {
      setError(e.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [schoolId, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const counts = {
    attendance: attendanceRisk.length,
    behavior: behaviorRisk.length,
    grades: gradesRisk.length,
  };

  // รวมนักเรียนเสี่ยงทั้ง 3 ด้านเป็น map เดียว (key = student_code) เพื่อหา
  // ภาพรวม, เสี่ยงซ้ำซ้อน, และแยกตามห้อง — คำนวณครั้งเดียวตอนข้อมูลเปลี่ยน
  const summary = useMemo(() => {
    const byCode = new Map();
    const addRisk = (code, name, classroom, kind) => {
      if (!byCode.has(code)) {
        byCode.set(code, { student_code: code, student_name: name, classroom, kinds: [] });
      }
      byCode.get(code).kinds.push(kind);
    };
    attendanceRisk.forEach((r) => addRisk(r.student_code, r.student_name, r.class_name, 'attendance'));
    behaviorRisk.forEach((r) => addRisk(r.student_code, `${r.first_name} ${r.last_name}`.trim(), r.classroom, 'behavior'));
    gradesRisk.forEach((r) => addRisk(r.student_code, r.student_name, r.classroom, 'grades'));

    const allRisk = Array.from(byCode.values());
    const overlapping = allRisk.filter((s) => s.kinds.length >= 2)
      .sort((a, b) => b.kinds.length - a.kinds.length);

    // แยกตามห้อง — นับจำนวนคนเสี่ยง (คนละคนกัน ไม่ซ้ำ) ต่อห้อง
    const byClass = new Map();
    allRisk.forEach((s) => {
      const cls = s.classroom || 'ไม่ระบุห้อง';
      byClass.set(cls, (byClass.get(cls) || 0) + 1);
    });
    const byClassList = Array.from(byClass.entries())
      .map(([classroom, count]) => ({ classroom, count }))
      .sort((a, b) => b.count - a.count);
    const maxClassCount = byClassList.length ? byClassList[0].count : 0;

    const riskCount = allRisk.length;
    const riskRate = totalStudents > 0 ? (riskCount / totalStudents) * 100 : 0;

    return { allRisk, overlapping, byClassList, maxClassCount, riskCount, riskRate };
  }, [attendanceRisk, behaviorRisk, gradesRisk, totalStudents]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">ภาพรวมนักเรียนที่เสี่ยง</h1>
            <p className="text-sm text-gray-500 mt-1">
              สรุปนักเรียนที่ต้องให้ความสนใจเป็นพิเศษ — {user?.school_name || ''}
            </p>
          </div>

          {/* สรุปผลภาพรวม */}
          {!loading && (
            <div className="grid grid-cols-3 max-md:grid-cols-1 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">🎓</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
                  <div className="text-sm text-gray-500">นักเรียนทั้งหมด</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl shrink-0">⚠️</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {summary.riskCount}
                    <span className="text-base font-medium text-gray-400 ml-1">
                      ({summary.riskRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">นักเรียนที่เสี่ยง (อย่างน้อย 1 ด้าน)</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl shrink-0">🔺</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{summary.overlapping.length}</div>
                  <div className="text-sm text-gray-500">เสี่ยงซ้ำซ้อนตั้งแต่ 2 ด้าน</div>
                </div>
              </div>
            </div>
          )}

          {/* แยกตามห้องเรียน */}
          {!loading && summary.byClassList.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h3 className="m-0 mb-4 text-base font-semibold text-gray-900">จำนวนนักเรียนที่เสี่ยงแยกตามห้อง</h3>
              <div className="flex flex-col gap-2.5">
                {summary.byClassList.map(({ classroom, count }) => (
                  <div key={classroom} className="flex items-center gap-3">
                    <div className="w-20 shrink-0 text-sm text-gray-600 text-right">{classroom}</div>
                    <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-lg flex items-center justify-end px-2 transition-all"
                        style={{ width: `${summary.maxClassCount ? (count / summary.maxClassCount) * 100 : 0}%` }}
                      >
                        <span className="text-xs text-white font-semibold">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* นักเรียนที่เสี่ยงซ้ำซ้อน */}
          {!loading && summary.overlapping.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="m-0 text-base font-semibold text-gray-900">
                  นักเรียนที่เสี่ยงหลายด้านพร้อมกัน
                </h3>
                <p className="text-xs text-gray-400 mt-1">ควรได้รับความสนใจเป็นลำดับแรก</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-6 py-3 font-medium">รหัสนักเรียน</th>
                      <th className="px-6 py-3 font-medium">ชื่อ</th>
                      <th className="px-6 py-3 font-medium">ห้อง</th>
                      <th className="px-6 py-3 font-medium">เสี่ยงด้าน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.overlapping.map((s) => (
                      <tr key={s.student_code} className="border-b border-gray-50 last:border-0">
                        <td className="px-6 py-3 text-gray-700">{s.student_code}</td>
                        <td className="px-6 py-3 text-gray-900 font-medium">{s.student_name}</td>
                        <td className="px-6 py-3 text-gray-600">{s.classroom}</td>
                        <td className="px-6 py-3 flex gap-1.5 flex-wrap">
                          {s.kinds.map((k) => {
                            const t = RISK_TABS.find((rt) => rt.key === k);
                            return (
                              <span key={k} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg font-medium">
                                {t?.label || k}
                              </span>
                            );
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary cards ต่อด้าน */}
          <div className="grid grid-cols-3 max-md:grid-cols-1 gap-4 mb-6">
            {RISK_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-left bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all ${
                  tab === t.key ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="text-sm text-gray-500 mb-1">{t.label}</div>
                <div className="text-3xl font-bold text-gray-900">
                  {loading ? '—' : counts[t.key]}
                </div>
                <div className="text-xs text-gray-400 mt-1">คนที่เสี่ยง</div>
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {/* Detail table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="m-0 text-base font-semibold text-gray-900">
                {RISK_TABS.find((t) => t.key === tab)?.label}
              </h3>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-400">กำลังโหลด...</div>
            ) : (
              <>
                {tab === 'attendance' && <AttendanceTable rows={attendanceRisk} />}
                {tab === 'behavior' && <BehaviorTable rows={behaviorRisk} />}
                {tab === 'grades' && <GradesTable rows={gradesRisk} />}
              </>
            )}
          </div>

          {/* ข้อมูลโรงเรียนของตัวเอง — read-only (ผู้บริหารดูอย่างเดียว
              ไม่มีปุ่มแก้ไข/ลบ/ตั้งพิกัด ต่างจากหน้า admin) */}
          {mySchool && (
            <div className="mt-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">ข้อมูลโรงเรียน</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-sm">
                <div className="flex items-center gap-3 mb-3">
                  <SchoolAvatar schoolId={mySchool.id} name={mySchool.name} />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 leading-tight">{mySchool.name}</h3>
                    <p className="text-sm text-gray-500">{mySchool.address}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {mySchool.classrooms?.length ?? 0} ห้องเรียน
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {totalStudents} นักเรียน
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyRow = ({ children }) => (
  <div className="p-10 text-center text-gray-400 text-sm">{children}</div>
);

const AttendanceTable = ({ rows }) => {
  if (!rows.length) return <EmptyRow>ไม่มีนักเรียนที่เสี่ยงด้านการเช็คชื่อ</EmptyRow>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="px-6 py-3 font-medium">รหัสนักเรียน</th>
            <th className="px-6 py-3 font-medium">ชื่อ</th>
            <th className="px-6 py-3 font-medium">ห้อง</th>
            <th className="px-6 py-3 font-medium">อัตรามาเรียน</th>
            <th className="px-6 py-3 font-medium">มา/ขาด/สาย/ลา</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student_code} className="border-b border-gray-50 last:border-0">
              <td className="px-6 py-3 text-gray-700">{r.student_code}</td>
              <td className="px-6 py-3 text-gray-900 font-medium">{r.student_name}</td>
              <td className="px-6 py-3 text-gray-600">{r.class_name}</td>
              <td className="px-6 py-3">
                <span className="text-red-600 font-semibold">{r.attendance_rate.toFixed(1)}%</span>
              </td>
              <td className="px-6 py-3 text-gray-500">
                {r.present_count}/{r.absent_count}/{r.late_count}/{r.leave_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const BehaviorTable = ({ rows }) => {
  if (!rows.length) return <EmptyRow>ไม่มีนักเรียนที่คะแนนพฤติกรรมต่ำกว่าเกณฑ์</EmptyRow>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="px-6 py-3 font-medium">รหัสนักเรียน</th>
            <th className="px-6 py-3 font-medium">ชื่อ</th>
            <th className="px-6 py-3 font-medium">ห้อง</th>
            <th className="px-6 py-3 font-medium">คะแนนคงเหลือ</th>
            <th className="px-6 py-3 font-medium">ถูกหักไปแล้ว</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student_code} className="border-b border-gray-50 last:border-0">
              <td className="px-6 py-3 text-gray-700">{r.student_code}</td>
              <td className="px-6 py-3 text-gray-900 font-medium">{r.first_name} {r.last_name}</td>
              <td className="px-6 py-3 text-gray-600">{r.classroom}</td>
              <td className="px-6 py-3">
                <span className="text-orange-600 font-semibold">{r.current_score}</span>
              </td>
              <td className="px-6 py-3 text-gray-500">{r.total_deducted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const GradesTable = ({ rows }) => {
  if (!rows.length) return <EmptyRow>ไม่มีนักเรียนที่มีวิชาตก</EmptyRow>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="px-6 py-3 font-medium">รหัสนักเรียน</th>
            <th className="px-6 py-3 font-medium">ชื่อ</th>
            <th className="px-6 py-3 font-medium">ห้อง</th>
            <th className="px-6 py-3 font-medium">วิชาที่ตก</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student_code} className="border-b border-gray-50 last:border-0">
              <td className="px-6 py-3 text-gray-700">{r.student_code}</td>
              <td className="px-6 py-3 text-gray-900 font-medium">{r.student_name}</td>
              <td className="px-6 py-3 text-gray-600">{r.classroom}</td>
              <td className="px-6 py-3">
                <span className="text-red-600 font-semibold">{r.failed_subjects.length} วิชา</span>
                <span className="text-gray-400 ml-2">({r.failed_subjects.join(', ')})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExecutiveDashboard;
