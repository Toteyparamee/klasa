'use client';

import { useState, useEffect } from 'react';
import { subjectAPI, scheduleAPI, getToken, API_CONFIG } from '../api';
import { periodGridAPI } from '../api/scheduleApi';
import { loadPeriodConfig } from './PeriodGridSettings';
import { useAuth } from '../context/AuthContext';
import { useSchoolId } from '../hooks/useSchoolId';

const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.replace('.', ':').split(':').map(Number);
  return h * 60 + (m || 0);
};

const formatPeriodLabel = (period) => {
  if (!period || period === '-') return period;
  return `คาบ ${period}`;
};

// คืนช่วงคาบที่ overlap กับช่วง start-end เช่น "1", "1-3"
const calcPeriodFromTime = (start, end, periodSlots) => {
  if (!start || !end) return '';
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const matched = [];
  let periodNum = 1;
  for (const slot of periodSlots) {
    const isBreak = slot.isBreak ?? slot.is_break ?? false;
    if (!isBreak) {
      const ss = timeToMinutes(slot.start);
      const se = timeToMinutes(slot.end);
      if (s < se && e > ss) matched.push(periodNum);
      periodNum++;
    }
  }
  if (matched.length === 0) return '';
  if (matched.length === 1) return String(matched[0]);
  return `${matched[0]}-${matched[matched.length - 1]}`;
};

const emptyForm = {
  subjectName: '',
  subjectCode: '',
  credits: '',
  teacherCode: '',
  classId: '',
  dayOfWeek: '',
  period: '',
  startTime: '',
  endTime: '',
  room: '',
  semester: '1',
  academicYear: '2568',
};

const SubjectManagement = ({ onSubjectsUpdate, selectedTeacher, teachers = [], onTeacherChange, classrooms = [] }) => {
  const { getValidToken } = useAuth();
  const schoolId = useSchoolId();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodSlots, setPeriodSlots] = useState(loadPeriodConfig());

  // โหลด period config จาก API
  useEffect(() => {
    if (!schoolId) return;
    const fetchPeriodConfig = async () => {
      try {
        const token = getToken();
        const data = await periodGridAPI.getConfig(schoolId, token);
        if (data.success && data.data?.slots) {
          const raw = typeof data.data.slots === 'string'
            ? JSON.parse(data.data.slots)
            : data.data.slots;
          const parsed = raw.map(s => ({ ...s, isBreak: s.isBreak ?? s.is_break ?? false }));
          setPeriodSlots(parsed);
        }
      } catch {}
    };
    fetchPeriodConfig();
  }, [schoolId]);

  // ฟังก์ชันดึงรายวิชาจาก API
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        console.warn('No access token found');
        setLoading(false);
        return;
      }

      let data;

      // ถ้าเลือกครู ให้ดึงเฉพาะรายวิชาของครูนั้น
      if (selectedTeacher) {
        const teacher = teachers.find(t =>
          `${t.titleTh || ''}${t.firstNameTh} ${t.lastNameTh}` === selectedTeacher
        );
        if (teacher?.teacherCode) {
          data = await subjectAPI.getSubjectsByTeacher(teacher.teacherCode, token);
        } else {
          data = await subjectAPI.getSubjects(schoolId, token);
        }
      } else {
        data = await subjectAPI.getSubjects(schoolId, token);
      }

      console.log('Subjects data received:', data);

      if (data.success && data.data) {
        const dayNames = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

        // ดึง schedule ของทุก subject แล้วแตกเป็น 1 แถวต่อ 1 schedule
        const rows = (await Promise.all(
          data.data.map(async (subject) => {
            try {
              const scheduleData = await scheduleAPI.getSchedulesBySubject(subject.id, {}, token);
              if (scheduleData.success && scheduleData.data && scheduleData.data.length > 0) {
                return scheduleData.data.map((schedule) => {
                  const teacher = teachers.find(t => t.teacherCode === schedule.teacher_code);
                  const teacherName = teacher
                    ? `${teacher.titleTh || ''}${teacher.firstNameTh} ${teacher.lastNameTh}`
                    : (schedule.teacher_code || '-');
                  const classroom = classrooms.find(c => c.id === schedule.class_id);
                  const classroomName = classroom
                    ? classroom.name
                    : (schedule.class_id ? `ห้อง ${schedule.class_id}` : '-');
                  return {
                    id: subject.id,
                    scheduleId: schedule.id,
                    subjectName: subject.subject_name,
                    subjectCode: subject.subject_code,
                    credits: subject.credits ?? '',
                    teacherName,
                    classroomName,
                    dayOfWeek: dayNames[schedule.day_of_week] || '-',
                    period: calcPeriodFromTime(schedule.start_time, schedule.end_time, periodSlots) || schedule.period || '-',
                    startTime: schedule.start_time || '-',
                    endTime: schedule.end_time || '-',
                    room: schedule.room || '-',
                    semester: schedule.semester || '-',
                    academicYear: schedule.academic_year || '-',
                    // เก็บไว้ใช้ตอน edit
                    _scheduleClassId: schedule.class_id,
                    _scheduleTeacherCode: schedule.teacher_code,
                    _scheduleDayOfWeek: schedule.day_of_week,
                    _schedulePeriod: schedule.period,
                    _scheduleStartTime: schedule.start_time,
                    _scheduleEndTime: schedule.end_time,
                    _scheduleRoom: schedule.room,
                    _scheduleSemester: schedule.semester,
                    _scheduleAcademicYear: schedule.academic_year,
                  };
                });
              }
            } catch (err) {
              console.error('Error fetching schedule for subject:', subject.id, err);
            }
            // วิชาที่ยังไม่มีตารางสอน
            return [{
              id: subject.id,
              scheduleId: null,
              subjectName: subject.subject_name,
              subjectCode: subject.subject_code,
              credits: subject.credits ?? '',
              teacherName: '-',
              classroomName: '-',
              dayOfWeek: '-',
              period: '-',
              startTime: '-',
              endTime: '-',
              room: '-',
              semester: '-',
              academicYear: '-',
            }];
          })
        )).flat();

        setSubjects(rows);
      } else {
        console.warn('Invalid data structure:', data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงรายวิชาจาก API เมื่อโหลดหน้า หรือเมื่อเปลี่ยนครู
  useEffect(() => {
    if (!schoolId) return;
    fetchSubjects();
  }, [schoolId, selectedTeacher, teachers, classrooms, periodSlots]);

  // อัพเดต subjects ไปยัง parent component
  useEffect(() => {
    if (onSubjectsUpdate) {
      onSubjectsUpdate(subjects);
    }
  }, [subjects, onSubjectsUpdate]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const days = [
    { value: 1, label: 'จันทร์' },
    { value: 2, label: 'อังคาร' },
    { value: 3, label: 'พุธ' },
    { value: 4, label: 'พฤหัสบดี' },
    { value: 5, label: 'ศุกร์' },
    { value: 6, label: 'เสาร์' },
    { value: 7, label: 'อาทิตย์' }
  ];

  // สร้าง periods จาก periodSlots (เฉพาะที่ไม่ใช่ break)
  const periods = periodSlots
    .filter(s => !(s.isBreak ?? s.is_break ?? false))
    .map((s, i) => ({ value: i + 1, label: s.label, start: s.start, end: s.end }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // คำนวณคาบอัตโนมัติเมื่อกรอกเวลา
      if (name === 'startTime' || name === 'endTime') {
        const start = name === 'startTime' ? value : prev.startTime;
        const end = name === 'endTime' ? value : prev.endTime;
        const calculated = calcPeriodFromTime(start, end, periodSlots);
        if (calculated) updated.period = calculated;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.subjectName || !formData.subjectCode) {
      alert('กรุณากรอกข้อมูลรายวิชาให้ครบถ้วน');
      return;
    }

    if (!formData.teacherCode || !formData.classId || !formData.dayOfWeek ||
      !formData.period || !formData.startTime || !formData.endTime) {
      alert('กรุณากรอกข้อมูลตารางสอนให้ครบถ้วน');
      return;
    }

    try {
      const token = await getValidToken();

      if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      const creditsValue = parseFloat(formData.credits) || 0;

      if (editingSubject) {
        // แก้ไขรายวิชา
        const data = await subjectAPI.updateSubject(editingSubject.id, {
          subject_name: formData.subjectName,
          subject_code: formData.subjectCode,
          credits: creditsValue,
        }, token);

        if (!data.success) {
          alert(`เกิดข้อผิดพลาดในการแก้ไขรายวิชา: ${data.message}`);
          return;
        }

        // อัปเดต schedule ถ้ามี editingScheduleId
        if (editingScheduleId) {
          const scheduleData = await scheduleAPI.updateSchedule(editingScheduleId, {
            teacher_code: formData.teacherCode,
            class_id: parseInt(formData.classId),
            day_of_week: parseInt(formData.dayOfWeek),
            period: parseInt(formData.period),
            start_time: formData.startTime,
            end_time: formData.endTime,
            room: formData.room,
            semester: parseInt(formData.semester),
            academic_year: formData.academicYear
          }, token);

          if (scheduleData.success) {
            alert('แก้ไขข้อมูลรายวิชาและตารางสอนสำเร็จ');
          } else {
            alert(`แก้ไขรายวิชาสำเร็จ แต่เกิดข้อผิดพลาดในการแก้ไขตารางสอน: ${scheduleData.message}`);
          }
        } else if (formData.teacherCode && formData.classId && formData.dayOfWeek && formData.period && formData.startTime && formData.endTime) {
          // ถ้าไม่มี schedule เดิม แต่กรอกข้อมูลตารางสอนมา ให้สร้างใหม่
          const scheduleData = await scheduleAPI.createSchedule({
            school_id: schoolId,
            class_id: parseInt(formData.classId),
            subject_id: editingSubject.id,
            teacher_code: formData.teacherCode,
            day_of_week: parseInt(formData.dayOfWeek),
            period: parseInt(formData.period),
            start_time: formData.startTime,
            end_time: formData.endTime,
            room: formData.room,
            semester: parseInt(formData.semester),
            academic_year: formData.academicYear
          }, token);

          if (scheduleData.success) {
            alert('แก้ไขรายวิชาและสร้างตารางสอนสำเร็จ');
          } else {
            alert(`แก้ไขรายวิชาสำเร็จ แต่เกิดข้อผิดพลาดในการสร้างตารางสอน: ${scheduleData.message}`);
          }
        } else {
          alert('แก้ไขข้อมูลรายวิชาสำเร็จ');
        }

        // Refresh subjects data
        await fetchSubjects();
      } else {
        // เพิ่มรายวิชาใหม่
        const subjectData = await subjectAPI.createSubject({
          school_id: schoolId,
          class_id: parseInt(formData.classId) || 0,
          subject_code: formData.subjectCode,
          subject_name: formData.subjectName,
          credits: creditsValue,
        }, token);

        if (!subjectData.success) {
          alert(`เกิดข้อผิดพลาดในการสร้างรายวิชา: ${subjectData.message}`);
          return;
        }

        // สร้าง schedule
        const scheduleData = await scheduleAPI.createSchedule({
          school_id: schoolId,
          class_id: parseInt(formData.classId),
          subject_id: subjectData.data.id,
          teacher_code: formData.teacherCode,
          day_of_week: parseInt(formData.dayOfWeek),
          period: parseInt(formData.period),
          start_time: formData.startTime,
          end_time: formData.endTime,
          room: formData.room,
          semester: parseInt(formData.semester),
          academic_year: formData.academicYear
        }, token);

        if (scheduleData.success) {
          alert('เพิ่มรายวิชาและตารางสอนสำเร็จ');
        } else {
          alert(`สร้างรายวิชาสำเร็จ แต่เกิดข้อผิดพลาดในการสร้างตารางสอน: ${scheduleData.message}`);
        }
        // Refresh subjects data
        await fetchSubjects();
      }

      setFormData(emptyForm);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleEdit = (row) => {
    setEditingSubject(row);
    setEditingScheduleId(row.scheduleId || null);
    setFormData({
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      credits: row.credits !== undefined && row.credits !== null ? String(row.credits) : '',
      teacherCode: row._scheduleTeacherCode || '',
      classId: row._scheduleClassId?.toString() || '',
      dayOfWeek: row._scheduleDayOfWeek?.toString() || '',
      period: row._schedulePeriod?.toString() || '',
      startTime: row._scheduleStartTime || '',
      endTime: row._scheduleEndTime || '',
      room: row._scheduleRoom || '',
      semester: row._scheduleSemester?.toString() || '1',
      academicYear: row._scheduleAcademicYear || '2568'
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายวิชานี้?')) {
      try {
        const token = await getValidToken();

        if (!token) {
          alert('กรุณาเข้าสู่ระบบก่อน');
          return;
        }

        const data = await subjectAPI.deleteSubject(id, token);

        if (data.success) {
          // ลบข้อมูลจาก state หลังจากลบใน database สำเร็จ
          setSubjects(subjects.filter(subject => subject.id !== id));
          alert('ลบข้อมูลรายวิชาสำเร็จ');
        } else {
          alert(`เกิดข้อผิดพลาด: ${data.message}`);
        }
      } catch (error) {
        console.error('Error deleting subject:', error);
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingSubject(null);
    setEditingScheduleId(null);
    setFormData(emptyForm);
  };

  const inputCls = 'p-3 border border-gray-300 rounded-lg text-[15px] transition-colors focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-full';

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 text-gray-800 text-2xl font-semibold">จัดการข้อมูลรายวิชา</h2>
        <div className="flex gap-2 items-center">
          {/* Teacher Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="teacher-select-subject" className="text-sm font-medium text-gray-600">ครู:</label>
            <select
              id="teacher-select-subject"
              value={selectedTeacher}
              onChange={(e) => onTeacherChange(e.target.value)}
              className="py-2 px-3 rounded border border-gray-300 text-sm"
            >
              <option value="">-- ทั้งหมด --</option>
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
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-br from-indigo-400 to-purple-600 text-white border-none py-3 px-6 rounded-lg cursor-pointer text-[15px] font-semibold transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            {showAddForm ? 'ยกเลิก' : '+ เพิ่มรายวิชา'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-7 rounded-xl shadow-md mb-7">
          <h3 className="mt-0 mb-5 text-gray-800 text-xl font-semibold">
            {editingSubject ? 'แก้ไขข้อมูลรายวิชา' : 'เพิ่มข้อมูลรายวิชาและตารางสอน'}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* ข้อมูลรายวิชา */}
            <div className="mb-5">
              <h4 className="mb-2 text-slate-700 font-semibold">ข้อมูลรายวิชา</h4>
              <div className="grid grid-cols-3 gap-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">ชื่อวิชา *</label>
                  <input
                    type="text"
                    name="subjectName"
                    value={formData.subjectName}
                    onChange={handleInputChange}
                    placeholder="เช่น คณิตศาสตร์"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">รหัสวิชา *</label>
                  <input
                    type="text"
                    name="subjectCode"
                    value={formData.subjectCode}
                    onChange={handleInputChange}
                    placeholder="เช่น M101"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">หน่วยกิต</label>
                  <input
                    type="number"
                    name="credits"
                    value={formData.credits}
                    onChange={handleInputChange}
                    placeholder="เช่น 1.5"
                    min="0"
                    step="0.5"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ข้อมูลตารางสอน */}
            <div className="mb-5">
              <h4 className="mb-2 text-slate-700 font-semibold">ข้อมูลตารางสอน</h4>
              <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">ครูผู้สอน *</label>
                  <select
                    name="teacherCode"
                    value={formData.teacherCode}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  >
                    <option value="">-- เลือกครู --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.teacherCode}>
                        {teacher.titleTh || ''}{teacher.firstNameTh} {teacher.lastNameTh}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">ชั้นเรียน/ห้อง *</label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  >
                    <option value="">-- เลือกชั้นเรียน --</option>
                    {classrooms && classrooms.length > 0 ? (
                      classrooms.map((classroom, index) => (
                        <option key={classroom.id || index} value={classroom.id}>
                          {classroom.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>ไม่พบข้อมูลห้องเรียน</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">วันที่สอน *</label>
                  <select
                    name="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  >
                    <option value="">-- เลือกวัน --</option>
                    {days.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">คาบที่</label>
                  <div className="p-2 border-2 border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700 font-semibold min-h-10 flex items-center">
                    {formData.period
                      ? formatPeriodLabel(formData.period)
                      : <span className="text-gray-400 font-normal text-[13px]">กรอกเวลาเริ่ม-สิ้นสุดเพื่อคำนวณ</span>
                    }
                  </div>
                  <input type="hidden" name="period" value={formData.period} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">เวลาเริ่ม *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">เวลาสิ้นสุด *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">ห้องเรียน</label>
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleInputChange}
                    placeholder="เช่น 301"
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">ภาคเรียน *</label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-5 max-sm:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-gray-500 text-sm">ปีการศึกษา *</label>
                  <input
                    type="text"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleInputChange}
                    placeholder="เช่น 2568"
                    required
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="py-3 px-6 bg-gray-400 text-white border-none rounded-lg cursor-pointer text-[15px] font-semibold hover:bg-gray-500 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="py-3 px-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-none rounded-lg cursor-pointer text-[15px] font-semibold transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              >
                {editingSubject ? 'บันทึกการแก้ไข' : 'เพิ่มรายวิชาและตารางสอน'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-400 rounded-full animate-spin"></div>
            <p className="text-indigo-400 text-base font-medium m-0">กำลังโหลดข้อมูล...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="m-2 text-lg">ยังไม่มีข้อมูลรายวิชา</p>
            <p className="m-2 text-sm text-gray-300">คลิกปุ่ม "+ เพิ่มรายวิชา" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-400 to-purple-600 text-white">
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">ชื่อวิชา</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">รหัสวิชา</th>
                  <th className="py-3 px-2 text-center font-semibold text-[13px] whitespace-nowrap">หน่วยกิต</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">ครูผู้สอน</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">ชั้นเรียน/ห้อง</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">วันที่สอน</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">คาบที่</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">เวลา</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">ห้องเรียน</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">ภาคเรียน</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">ปีการศึกษา</th>
                  <th className="py-3 px-2 text-left font-semibold text-[13px] whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, idx) => (
                  <tr
                    key={subject.scheduleId ?? `sub-${subject.id}-${idx}`}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.subjectName}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.subjectCode}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 text-center whitespace-nowrap">
                      {subject.credits !== '' && subject.credits !== null && subject.credits !== undefined ? subject.credits : '-'}
                    </td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.teacherName}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.classroomName}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.dayOfWeek}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{formatPeriodLabel(subject.period)}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.startTime} - {subject.endTime}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.room}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.semester}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">{subject.academicYear}</td>
                    <td className="py-3 px-2 text-[13px] text-gray-700 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="py-2 px-4 bg-blue-500 text-white border-none rounded-md cursor-pointer text-[13px] font-semibold hover:bg-blue-700 transition-colors"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="py-2 px-4 bg-red-500 text-white border-none rounded-md cursor-pointer text-[13px] font-semibold hover:bg-red-700 transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectManagement;
