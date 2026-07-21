'use client';

import { useState, useEffect } from 'react';
import { scheduleAPI, subjectAPI, getToken, API_CONFIG } from '../api';
import { getCurrentSemester } from '../api/settingsApi';
import { loadPeriodConfig } from './PeriodGridSettings';
import { periodGridAPI } from '../api/scheduleApi';
import { useSchoolId } from '../hooks/useSchoolId';
import { useAuth } from '../context/AuthContext';
import { useScheduleConflict } from '../hooks/useScheduleConflict';

const timeToMinutesModule = (t) => {
  if (!t) return 0;
  const [h, m] = t.replace('.', ':').split(':').map(Number);
  return h * 60 + (m || 0);
};

// คืนช่วงคาบที่ overlap กับช่วง start-end เช่น "1", "1-3"
const calcPeriodFromTime = (start, end, periodSlots) => {
  if (!start || !end) return '';
  const s = timeToMinutesModule(start);
  const e = timeToMinutesModule(end);
  const matched = [];
  let periodNum = 1;
  for (const slot of periodSlots) {
    const isBreak = slot.isBreak ?? slot.is_break ?? false;
    if (!isBreak) {
      const ss = timeToMinutesModule(slot.start);
      const se = timeToMinutesModule(slot.end);
      if (s < se && e > ss) matched.push(periodNum);
      periodNum++;
    }
  }
  if (matched.length === 0) return '';
  if (matched.length === 1) return String(matched[0]);
  return `${matched[0]}-${matched[matched.length - 1]}`;
};

const ClassSchedule = ({ classrooms = [], teachers = [], selectedClassId, onClassChange, periodConfigVersion = 0, school }) => {
  const schoolId = useSchoolId();
  const { getValidToken } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periodSlots, setPeriodSlots] = useState(loadPeriodConfig());
  const [detailItem, setDetailItem] = useState(null); // raw schedule item ที่กำลังดู/แก้ไข
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [detailFormData, setDetailFormData] = useState(null);
  const [detailSaving, setDetailSaving] = useState(false);

  const { checkConflict, reloadSchedules } = useScheduleConflict(
    school?.id ?? schoolId,
    detailItem?.semester,
    detailItem?.academic_year
  );

  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

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
  }, [periodConfigVersion, schoolId]);

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
    if (!selectedClassId) {
      setSchedules([]);
      return;
    }
    fetchClassSchedule();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, periodConfigVersion]);

  const fetchClassSchedule = async () => {
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

      const data = await scheduleAPI.getSchedulesByClass(selectedClassId, { semester, academicYear }, token);

      if (data.success && data.data) {
        setSchedules(data.data);
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching class schedule:', error);
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

  const getTeacherName = (teacherCode) => {
    const teacher = teachers.find(t => t.teacherCode === teacherCode);
    return teacher
      ? `${teacher.titleTh || ''}${teacher.firstNameTh} ${teacher.lastNameTh}`
      : (teacherCode || '-');
  };

  const convertToGridFormat = (scheduleList) => {
    const grid = {};
    days.forEach(day => { grid[day] = {}; });

    scheduleList.forEach(item => {
      const dayName = getDayName(item.day_of_week);
      if (!dayName || !grid[dayName]) return;

      const startTime = normalizeTime(item.start_time || '');
      const endTime = normalizeTime(item.end_time || '');
      const timeKey = `${startTime}-${endTime}`;

      const subject = item.subject || {};

      grid[dayName][timeKey] = {
        subject: subject.subject_name || '',
        subjectCode: subject.subject_code || '',
        teacherName: getTeacherName(item.teacher_code),
        room: item.room || '',
        raw: item,
      };
    });

    return grid;
  };

  const findScheduleForSlot = (daySchedule, slot) => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    for (const [timeKey, data] of Object.entries(daySchedule)) {
      const lastDash = timeKey.lastIndexOf('-');
      const start = timeKey.substring(0, lastDash);
      const end = timeKey.substring(lastDash + 1);
      const dataStart = timeToMinutes(start);
      const dataEnd = timeToMinutes(end);
      if (dataStart < slotEnd && dataEnd > slotStart) {
        return data;
      }
    }
    return null;
  };

  const getSubjectColors = (grid) => {
    const subjectNames = new Set();
    Object.values(grid).forEach(daySchedule => {
      Object.values(daySchedule).forEach(slot => {
        if (slot.subject) subjectNames.add(slot.subject);
      });
    });
    const colors = {};
    [...subjectNames].sort().forEach((name, i) => {
      colors[name] = colorPalette[i % colorPalette.length];
    });
    return colors;
  };

  const grid = convertToGridFormat(schedules);
  const subjectColors = getSubjectColors(grid);

  const describeConflict = (conflict) => {
    if (!conflict) return '';
    const teacherName = getTeacherName(conflict.teacher_code);
    const subjectName = conflict.subject?.subject_name || 'วิชาอื่น';
    return `${subjectName} (${teacherName}) เวลา ${conflict.start_time}-${conflict.end_time}`;
  };

  // เช็ค conflict ของฟอร์มแก้ไข แบบ real-time (ยกเว้นตัวเองที่กำลังแก้)
  const detailFormConflict = isEditingDetail ? checkConflict({
    classId: detailFormData?.classId,
    dayOfWeek: detailFormData?.dayOfWeek,
    startTime: detailFormData?.startTime,
    endTime: detailFormData?.endTime,
    excludeScheduleId: detailItem?.id,
  }) : null;

  const openDetail = (item) => {
    setDetailItem(item);
    setIsEditingDetail(false);
    setDetailFormData(null);
  };

  const closeDetail = () => {
    setDetailItem(null);
    setIsEditingDetail(false);
    setDetailFormData(null);
  };

  const openEditFromDetail = (itemOverride) => {
    const item = itemOverride || detailItem;
    if (!item) return;
    if (itemOverride) setDetailItem(itemOverride);
    setDetailFormData({
      subjectName: item.subject?.subject_name || '',
      subjectCode: item.subject?.subject_code || '',
      credits: item.subject?.credits !== undefined && item.subject?.credits !== null
        ? String(item.subject.credits) : '',
      classId: item.class_id?.toString() || '',
      dayOfWeek: item.day_of_week?.toString() || '',
      startTime: item.start_time || '',
      endTime: item.end_time || '',
      room: item.room || '',
    });
    setIsEditingDetail(true);
  };

  const handleDetailFormChange = (e) => {
    const { name, value } = e.target;
    setDetailFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDetail = async () => {
    if (!detailItem || !detailFormData) return;
    if (!detailFormData.subjectName || !detailFormData.subjectCode || !detailFormData.classId ||
      !detailFormData.dayOfWeek || !detailFormData.startTime || !detailFormData.endTime) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setDetailSaving(true);
    try {
      const token = await getValidToken();
      if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      const period = calcPeriodFromTime(detailFormData.startTime, detailFormData.endTime, periodSlots)
        || detailItem.period?.toString() || '1';

      const subjectRes = await subjectAPI.updateSubject(detailItem.subject_id, {
        subject_name: detailFormData.subjectName,
        subject_code: detailFormData.subjectCode,
        credits: parseFloat(detailFormData.credits) || 0,
      }, token);
      if (!subjectRes.success) {
        alert(`เกิดข้อผิดพลาดในการแก้ไขรายวิชา: ${subjectRes.message}`);
        return;
      }

      const scheduleRes = await scheduleAPI.updateSchedule(detailItem.id, {
        school_id: detailItem.school_id,
        class_id: parseInt(detailFormData.classId),
        subject_id: detailItem.subject_id,
        teacher_code: detailItem.teacher_code,
        day_of_week: parseInt(detailFormData.dayOfWeek),
        period: parseInt(period) || 1,
        start_time: detailFormData.startTime,
        end_time: detailFormData.endTime,
        room: detailFormData.room,
        semester: detailItem.semester,
        academic_year: detailItem.academic_year,
      }, token);
      if (!scheduleRes.success) {
        alert(`เกิดข้อผิดพลาดในการแก้ไขตารางสอน: ${scheduleRes.message}`);
        return;
      }

      alert('บันทึกการแก้ไขสำเร็จ');
      closeDetail();
      reloadSchedules();
      await fetchClassSchedule();
    } catch (error) {
      console.error('Error saving schedule detail:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <h2 className="text-2xl font-bold text-slate-800 mb-5">ตารางเรียนของห้อง</h2>

      {/* Dropdown เลือกห้อง */}
      <div className="flex items-center gap-3 mb-6">
        <label htmlFor="class-select" className="font-semibold text-slate-500 whitespace-nowrap">
          เลือกห้องเรียน:
        </label>
        <select
          id="class-select"
          value={selectedClassId}
          onChange={(e) => onClassChange(e.target.value)}
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-[0.9375rem] text-slate-800 bg-white cursor-pointer min-w-[220px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        >
          <option value="">-- เลือกห้องเรียน --</option>
          {classrooms.map((classroom, index) => (
            <option key={classroom.id || index} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </select>
      </div>

      {/* เนื้อหา */}
      {!selectedClassId ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📋</div>
          <p>กรุณาเลือกห้องเรียนเพื่อดูตารางเรียน</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
          <div className="w-8 h-8 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p>กำลังโหลดตารางเรียน...</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4 text-[0.9375rem]">
            <span className="text-slate-500 font-medium">ตารางเรียนของห้อง:</span>
            <span className="font-bold text-slate-800">
              {classrooms.find(c => c.id === parseInt(selectedClassId))?.name || selectedClassId}
            </span>
          </div>

          {/* Legend สีวิชา */}
          {Object.keys(subjectColors).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {Object.entries(subjectColors).map(([name, color]) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[1.5px] text-[0.8125rem] font-semibold"
                  style={{ borderColor: color, backgroundColor: `${color}15` }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
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
                        const color = subjectColors[slotData.subject] || '#6366F1';
                        return (
                          <td key={`${day}-${slot.label}`} className="border border-slate-100 min-w-[120px] align-top">
                            <div
                              onClick={() => openDetail(slotData.raw)}
                              className="relative m-1 p-2 rounded-lg flex flex-col gap-0.5 min-h-[60px] cursor-pointer hover:ring-2 hover:ring-offset-1 transition-shadow"
                              style={{
                                background: `linear-gradient(135deg, ${color}30, ${color}18)`,
                                borderLeft: `4px solid ${color}`,
                                '--tw-ring-color': color,
                              }}
                            >
                              {slotData.subjectCode && (
                                <div className="text-[0.7rem] font-bold tracking-wide" style={{ color: `${color}CC` }}>
                                  {slotData.subjectCode}
                                </div>
                              )}
                              <div className="text-[0.8125rem] font-bold" style={{ color }}>
                                {slotData.subject}
                              </div>
                              <div className="text-[0.75rem] text-slate-500 leading-snug">
                                {slotData.teacherName}
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
                <span className="text-[0.75rem] text-slate-400">จำนวนคาบเรียนทั้งหมด</span>
                <span className="text-base font-bold text-slate-800">{schedules.length} คาบ/สัปดาห์</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.75rem] text-slate-400">จำนวนวิชาที่เรียน</span>
                <span className="text-base font-bold text-slate-800">{Object.keys(subjectColors).length} วิชา</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal รายละเอียด / แก้ไข คาบเรียน */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">
                {isEditingDetail ? 'แก้ไขตารางเรียน' : 'รายละเอียดตารางเรียน'}
              </h3>
              <button
                type="button"
                onClick={closeDetail}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {!isEditingDetail ? (
              <div className="px-5 py-4 flex flex-col gap-3 text-sm">
                <DetailRow label="รหัสวิชา" value={detailItem.subject?.subject_code || '-'} />
                <DetailRow label="ชื่อวิชา" value={detailItem.subject?.subject_name || '-'} />
                <DetailRow label="หน่วยกิต" value={detailItem.subject?.credits ?? '-'} />
                <DetailRow label="ครูผู้สอน" value={getTeacherName(detailItem.teacher_code)} />
                <DetailRow label="วัน" value={getDayName(detailItem.day_of_week) || '-'} />
                <DetailRow label="เวลา" value={`${normalizeTime(detailItem.start_time)} - ${normalizeTime(detailItem.end_time)}`} />
                <DetailRow label="ห้องสอน" value={detailItem.room || '-'} />

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => openEditFromDetail()}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 flex flex-col gap-3 text-sm">
                <FormField label="รหัสวิชา *">
                  <input
                    type="text"
                    name="subjectCode"
                    value={detailFormData?.subjectCode || ''}
                    onChange={handleDetailFormChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </FormField>
                <FormField label="ชื่อวิชา *">
                  <input
                    type="text"
                    name="subjectName"
                    value={detailFormData?.subjectName || ''}
                    onChange={handleDetailFormChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </FormField>
                <FormField label="หน่วยกิต">
                  <input
                    type="number"
                    step="0.5"
                    name="credits"
                    value={detailFormData?.credits || ''}
                    onChange={handleDetailFormChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </FormField>
                <FormField label="ห้องเรียน *">
                  <select
                    name="classId"
                    value={detailFormData?.classId || ''}
                    onChange={handleDetailFormChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- เลือกห้องเรียน --</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="วัน *">
                  <select
                    name="dayOfWeek"
                    value={detailFormData?.dayOfWeek || ''}
                    onChange={handleDetailFormChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- เลือกวัน --</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>{getDayName(d)}</option>
                    ))}
                  </select>
                </FormField>
                <div className="flex gap-2">
                  <FormField label="เวลาเริ่ม *">
                    <input
                      type="time"
                      name="startTime"
                      value={detailFormData?.startTime || ''}
                      onChange={handleDetailFormChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </FormField>
                  <FormField label="เวลาสิ้นสุด *">
                    <input
                      type="time"
                      name="endTime"
                      value={detailFormData?.endTime || ''}
                      onChange={handleDetailFormChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </FormField>
                </div>
                <FormField label="ห้องสอน">
                  <input
                    type="text"
                    name="room"
                    value={detailFormData?.room || ''}
                    onChange={handleDetailFormChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </FormField>

                {detailFormData?.classId && detailFormData?.dayOfWeek && detailFormData?.startTime && detailFormData?.endTime && (
                  detailFormConflict ? (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                      <span>🔴</span>
                      <span>คาบนี้ชนกับ {describeConflict(detailFormConflict)}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
                      <span>🟢</span>
                      <span>คาบนี้ว่าง</span>
                    </div>
                  )
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleSaveDetail}
                    disabled={detailSaving}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {detailSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetail(false)}
                    disabled={detailSaving}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between gap-3">
    <span className="text-slate-400">{label}</span>
    <span className="font-semibold text-slate-800 text-right">{value}</span>
  </div>
);

const FormField = ({ label, children }) => (
  <div className="flex flex-col gap-1 flex-1">
    <label className="text-[0.8125rem] font-semibold text-slate-500">{label}</label>
    {children}
  </div>
);

export default ClassSchedule;
