'use client';

import { useState, useEffect, useRef } from 'react';
import { scheduleAPI, getToken, API_CONFIG } from '../api';
import { getCurrentSemester } from '../api/settingsApi';
import { loadPeriodConfig } from './PeriodGridSettings';
import { periodGridAPI } from '../api/scheduleApi';
import { useSchoolId } from '../hooks/useSchoolId';
import { buildURL } from '../api/config';
import { uploadAPI } from '../api/uploadApi';


const TeacherSchedule = ({ teachers = [], selectedTeacher, onTeacherChange, periodConfigVersion = 0, school }) => {
  const schoolId = useSchoolId();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periodSlots, setPeriodSlots] = useState(loadPeriodConfig());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [semesterInfo, setSemesterInfo] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const printRef = useRef(null);

  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  const effectiveSchoolId = school?.id ?? schoolId;

  useEffect(() => {
    if (!effectiveSchoolId) return;
    const token = getToken();
    const url = uploadAPI.getSchoolLogoUrl(effectiveSchoolId);
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        if (!r.ok) return null;
        const ct = r.headers.get('content-type') || '';
        if (!ct.startsWith('image/')) return null;
        return r.blob();
      })
      .then((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, [effectiveSchoolId]);

  useEffect(() => {
    const fetchPeriodConfig = async () => {
      try {
        const token = getToken();
        const data = await periodGridAPI.getConfig(schoolId, token);
        if (data.success && data.data?.slots) {
          const parsed = typeof data.data.slots === 'string'
            ? JSON.parse(data.data.slots)
            : data.data.slots;
          setPeriodSlots(parsed);
        }
      } catch (e) {
        console.error('Failed to load period config:', e);
      }
    };
    fetchPeriodConfig();
  }, [periodConfigVersion]);

  const getDayName = (dayOfWeek) => {
    const dayMap = {
      1: 'จันทร์',
      2: 'อังคาร',
      3: 'พุธ',
      4: 'พฤหัสบดี',
      5: 'ศุกร์',
      6: 'เสาร์',
      7: 'อาทิตย์'
    };
    return dayMap[dayOfWeek] || '';
  };

  const colorPalette = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
    '#14B8A6', '#6366F1', '#EC4899', '#F97316', '#06B6D4'
  ];

  useEffect(() => {
    if (!selectedTeacher) {
      setSchedules([]);
      return;
    }
    fetchTeacherSchedule();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacher, teachers, periodConfigVersion]);

  const fetchTeacherSchedule = async () => {
    const teacher = teachers.find(t =>
      `${t.titleTh || ''}${t.firstNameTh} ${t.lastNameTh}` === selectedTeacher
    );
    if (!teacher?.teacherCode) return;

    setLoading(true);
    try {
      const token = getToken();
      if (!token) { setLoading(false); return; }

      let semester = API_CONFIG.DEFAULT_SEMESTER;
      let academicYear = API_CONFIG.DEFAULT_ACADEMIC_YEAR;
      try {
        const current = await getCurrentSemester();
        if (current?.data) {
          semester = current.data.semester ?? semester;
          academicYear = String(current.data.academic_year ?? academicYear);
        }
      } catch {
        // ใช้ค่า default
      }
      setSemesterInfo({ semester, academicYear });

      const data = await scheduleAPI.getSchedulesByTeacher(
        teacher.teacherCode,
        { semester, academicYear },
        token
      );

      if (data.success && data.data) {
        setSchedules(data.data);
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const timeToMinutes = (time) => {
    if (!time) return 0;
    const parts = time.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const normalizeTime = (time) => {
    if (!time) return '';
    return time.length >= 5 ? time.substring(0, 5) : time;
  };

  const convertToGridFormat = () => {
    const grid = {};
    days.forEach(day => { grid[day] = {}; });

    schedules.forEach(item => {
      const dayName = getDayName(item.day_of_week);
      if (!dayName || !grid[dayName]) return;

      const startTime = normalizeTime(item.start_time || '');
      const endTime = normalizeTime(item.end_time || '');
      const timeKey = `${startTime}-${endTime}`;

      const subject = item.subject || {};
      const classInfo = item.class || {};
      const grade = classInfo.grade?.toString() || '';
      const section = classInfo.section?.toString() || '';
      const className = grade
        ? (grade.startsWith('ม.') ? `${grade}/${section}` : `ม.${grade}/${section}`)
        : '';

      grid[dayName][timeKey] = {
        subject: subject.subject_name || '',
        subjectCode: subject.subject_code || '',
        className,
        room: item.room || '',
      };
    });

    return grid;
  };

  const findScheduleForSlot = (daySchedule, slot) => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    for (const [timeKey, data] of Object.entries(daySchedule)) {
      const [start, end] = timeKey.split('-');
      const dataStart = timeToMinutes(start);
      const dataEnd = timeToMinutes(end);
      if (dataStart < slotEnd && dataEnd > slotStart) {
        return data;
      }
    }
    return null;
  };

  const getClassColors = (grid) => {
    const classNames = new Set();
    Object.values(grid).forEach(daySchedule => {
      Object.values(daySchedule).forEach(slot => {
        if (slot.className) classNames.add(slot.className);
      });
    });
    const colors = {};
    [...classNames].sort().forEach((name, i) => {
      colors[name] = colorPalette[i % colorPalette.length];
    });
    return colors;
  };

  const grid = convertToGridFormat();
  const classColors = getClassColors(grid);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // รอให้ React render printable div ก่อน capture
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      // fit หน้าเดียว — ถ้าสูงเกิน ย่อลงให้พอดี
      const drawH = Math.min(imgH, pageH - margin * 2);
      const drawW = imgH > pageH - margin * 2 ? (canvas.width * drawH) / canvas.height : imgW;
      const offsetX = margin + (imgW - drawW) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', offsetX, margin, drawW, drawH);

      const teacherName = selectedTeacher || 'teacher';
      pdf.save(`ตารางสอน_${teacherName}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('ไม่สามารถสร้าง PDF ได้: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <h2 className="text-2xl font-bold text-slate-800 mb-5">ตารางสอน</h2>

      {/* Dropdown เลือกครู */}
      <div className="flex items-center gap-3 mb-6">
        <label htmlFor="teacher-select" className="font-semibold text-slate-500 whitespace-nowrap">
          เลือกครู:
        </label>
        <select
          id="teacher-select"
          value={selectedTeacher}
          onChange={(e) => onTeacherChange(e.target.value)}
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-[0.9375rem] text-slate-800 bg-white cursor-pointer min-w-[220px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        >
          <option value="">-- เลือกครู --</option>
          {teachers.map((teacher, index) => (
            <option
              key={teacher.id || index}
              value={`${teacher.titleTh || ''}${teacher.firstNameTh} ${teacher.lastNameTh}`}
            >
              {teacher.titleTh || ''}{teacher.firstNameTh} {teacher.lastNameTh}
            </option>
          ))}
        </select>
      </div>

      {/* เนื้อหา */}
      {!selectedTeacher ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📋</div>
          <p>กรุณาเลือกครูเพื่อดูตารางสอน</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
          <div className="w-8 h-8 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p>กำลังโหลดตารางสอน...</p>
        </div>
      ) : (
        <div>
          {/* ชื่อครูที่เลือก + ปุ่ม PDF */}
          <div className="flex items-center justify-between gap-2 mb-4 text-[0.9375rem]">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">ตารางสอนของ:</span>
              <span className="font-bold text-slate-800">{selectedTeacher}</span>
            </div>
            {schedules.length > 0 && (
              <button
                onClick={handleExportPDF}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                {pdfLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังสร้าง PDF...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    ดาวน์โหลด PDF
                  </>
                )}
              </button>
            )}
          </div>

          {/* Hidden printable div สำหรับ PDF — ขนาดตรงกับ A4 landscape @96dpi: 1122×794px */}
          <div
            ref={printRef}
            style={{
              position: 'absolute',
              left: '-9999px',
              top: 0,
              width: '1060px',
              backgroundColor: '#ffffff',
              padding: '20px 24px 16px',
              fontFamily: 'Tahoma, Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          >
            {/* Header: Logo กึ่งกลาง + ชื่อโรงเรียน + ข้อมูลครู */}
            <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #334155', paddingBottom: '10px' }}>
              {logoBase64 && (
                <img
                  src={logoBase64}
                  alt="logo"
                  style={{ width: '64px', height: '64px', objectFit: 'contain', display: 'block', margin: '0 auto 6px' }}
                />
              )}
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginBottom: '3px' }}>
                {school?.name || 'โรงเรียน'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '2px' }}>
                ตารางสอนของ {selectedTeacher}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                รหัสครู {teachers.find(t => `${t.titleTh || ''}${t.firstNameTh} ${t.lastNameTh}` === selectedTeacher)?.teacherCode || ''}
                {semesterInfo ? `  ·  ภาคเรียนที่ ${semesterInfo.semester}  ปีการศึกษา ${semesterInfo.academicYear}` : ''}
              </div>
            </div>

            {/* ตาราง */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 'bold', color: '#475569', textAlign: 'center', width: '80px' }}>
                    คาบที่ / เวลา
                  </th>
                  {days.map(day => (
                    <th key={day} style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodSlots.map((slot) => {
                  const isBreak = slot.isBreak;
                  return (
                    <tr key={slot.label} style={{ backgroundColor: isBreak ? '#fefce8' : '#ffffff' }}>
                      <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', backgroundColor: '#f8fafc', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '11px' }}>{slot.label}</div>
                        <div style={{ color: '#94a3b8', fontSize: '10px' }}>{slot.start}–{slot.end}</div>
                      </td>
                      {days.map(day => {
                        if (isBreak) {
                          return (
                            <td key={`${day}-break`} style={{ border: '1px solid #e2e8f0', padding: '4px', textAlign: 'center', color: '#92400e', fontWeight: '600', fontSize: '11px', backgroundColor: '#fefce8' }}>
                              พักกลางวัน
                            </td>
                          );
                        }
                        const daySchedule = grid[day] || {};
                        const slotData = findScheduleForSlot(daySchedule, slot);
                        if (slotData) {
                          const color = classColors[slotData.className] || '#6366F1';
                          return (
                            <td key={`${day}-${slot.label}`} style={{ border: '1px solid #e2e8f0', padding: '3px', verticalAlign: 'top' }}>
                              <div style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                borderLeft: `3px solid ${color}`,
                                backgroundColor: `${color}18`,
                                minHeight: '42px',
                              }}>
                                {slotData.subjectCode && (
                                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: `${color}CC`, marginBottom: '1px' }}>
                                    {slotData.subjectCode}
                                  </div>
                                )}
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color }}>
                                  {slotData.className}
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.3' }}>
                                  {slotData.subject}
                                </div>
                                {slotData.room && (
                                  <div style={{ fontSize: '9px', color: `${color}AA`, marginTop: '1px' }}>
                                    ห้อง {slotData.room}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={`${day}-${slot.label}`} style={{ border: '1px solid #e2e8f0', padding: '4px', textAlign: 'center', color: '#cbd5e1' }}>
                            –
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>

          {/* Legend สีห้องเรียน */}
          {Object.keys(classColors).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {Object.entries(classColors).map(([name, color]) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[1.5px] text-[0.8125rem] font-semibold"
                  style={{ borderColor: color, backgroundColor: `${color}15` }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span style={{ color }}>{name}</span>
                </div>
              ))}
            </div>
          )}

          {/* ตาราง Grid */}
          <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
            <table className="w-full border-collapse bg-white text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left pl-4 pr-2.5 py-3 font-bold text-slate-500 border-b-2 border-slate-200 whitespace-nowrap min-w-[110px]">
                    เวลา
                  </th>
                  {days.map(day => (
                    <th key={day} className="text-center px-2.5 py-3 font-bold text-slate-500 border-b-2 border-slate-200 whitespace-nowrap">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodSlots.map((slot) => (
                  <tr key={slot.label} className={slot.isBreak ? 'bg-yellow-50' : ''}>
                    {/* Time cell */}
                    <td className="bg-slate-50 pl-4 pr-2.5 py-2 align-middle border border-slate-100">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-[0.8125rem]">{slot.label}</span>
                        <span className="text-[0.75rem] text-slate-400">{slot.start}-{slot.end}</span>
                      </div>
                    </td>

                    {days.map(day => {
                      if (slot.isBreak) {
                        return (
                          <td key={`${day}-break`} className="text-center text-amber-700 text-[0.8125rem] font-semibold px-2 py-2 border border-slate-100 bg-yellow-50">
                            พักกลางวัน
                          </td>
                        );
                      }

                      const daySchedule = grid[day] || {};
                      const slotData = findScheduleForSlot(daySchedule, slot);

                      if (slotData) {
                        const color = classColors[slotData.className] || '#6366F1';
                        return (
                          <td key={`${day}-${slot.label}`} className="border border-slate-100 min-w-[120px] align-top">
                            <div
                              className="m-1 p-2 rounded-lg flex flex-col gap-0.5 min-h-[60px]"
                              style={{
                                background: `linear-gradient(135deg, ${color}30, ${color}18)`,
                                borderLeft: `4px solid ${color}`,
                              }}
                            >
                              {slotData.subjectCode && (
                                <div className="text-[0.7rem] font-bold tracking-wide" style={{ color: `${color}CC` }}>
                                  {slotData.subjectCode}
                                </div>
                              )}
                              <div className="text-[0.8125rem] font-bold" style={{ color }}>
                                {slotData.className}
                              </div>
                              <div className="text-[0.75rem] text-slate-500 leading-snug">
                                {slotData.subject}
                              </div>
                              {slotData.room && (
                                <div className="text-[0.6875rem] mt-0.5" style={{ color: `${color}AA` }}>
                                  ห้อง {slotData.room}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${day}-${slot.label}`} className="border border-slate-100 text-center px-2 py-3 min-w-[120px]">
                          <span className="text-slate-300 text-base">-</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* สรุปข้อมูล */}
          {schedules.length > 0 && (
            <div className="flex gap-6 mt-5 px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.75rem] text-slate-400">จำนวนคาบสอนทั้งหมด</span>
                <span className="text-base font-bold text-slate-800">{schedules.length} คาบ/สัปดาห์</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.75rem] text-slate-400">จำนวนห้องที่สอน</span>
                <span className="text-base font-bold text-slate-800">{Object.keys(classColors).length} ห้อง</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherSchedule;
