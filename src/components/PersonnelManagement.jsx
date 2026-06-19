'use client';

import { useState } from 'react';
import StudentForm from './StudentForm';
import TeacherForm from './TeacherForm';
import StudentBatchUploadForm from './StudentBatchUploadForm';
import StudentDetailModal from './StudentDetailModal';
import TeacherDetailModal from './TeacherDetailModal';
import ScheduleManagement from './ScheduleManagement';
import BehaviorManagement from './BehaviorManagement';

const emptyStudent = () => ({
  studentId: '',
  studentNumber: '',
  firstNameTh: '',
  lastNameTh: '',
  firstNameEn: '',
  lastNameEn: '',
  address: '',
  phone: '',
  fatherName: '',
  motherName: '',
});

const PersonnelManagement = ({
  school,
  onAddStudent,
  onAddStudentsBatch,
  onUpdateStudent,
  onDeleteStudent,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onAddClassroom,
  onDeleteClassroom,
}) => {
  const [activeTab, setActiveTab] = useState('students');
  const [showAddStudentForm, setShowAddStudentForm] = useState(null);
  const [showAddTeacherForm, setShowAddTeacherForm] = useState(false);
  const [showBatchUploadForm, setShowBatchUploadForm] = useState(false);
  const [showManualAddForm, setShowManualAddForm] = useState(false);
  const [manualAddClassroomId, setManualAddClassroomId] = useState('');
  const [showAddStudentMenu, setShowAddStudentMenu] = useState(false);
  const [showNewClassroomFlow, setShowNewClassroomFlow] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomStudents, setNewClassroomStudents] = useState([emptyStudent()]);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null); // { studentId, classroomId }
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [deleteStudentDialog, setDeleteStudentDialog] = useState(null); // { classroomId, studentId }

  const confirmDeleteStudent = async (deleteUser) => {
    const { classroomId, studentId } = deleteStudentDialog;
    setDeleteStudentDialog(null);
    try {
      await onDeleteStudent(classroomId, studentId, deleteUser);
    } catch (err) {
      alert('ลบนักเรียนไม่สำเร็จ: ' + (err.message || err));
    }
  };

  const handleAddStudent = (studentData, classroomId) => {
    onAddStudent(classroomId, studentData);
    setShowAddStudentForm(null);
  };

  const handleStudentUpdate = (body) => {
    if (!selectedStudent) return Promise.resolve();
    return onUpdateStudent(selectedStudent.classroomId, selectedStudent.dbId, body);
  };

  const handleAddTeacher = (teacherData) => {
    if (editingTeacher) {
      // แก้ไขครู
      onUpdateTeacher(teacherData);
    } else {
      // เพิ่มครูใหม่
      onAddTeacher(teacherData);
    }
    setShowAddTeacherForm(false);
    setEditingTeacher(null);
  };

  const handleTeacherDetailUpdate = async (teacherData) => {
    await onUpdateTeacher(teacherData);
    // sync local selection so modal reflects new values immediately
    setSelectedTeacher((prev) => (prev ? {
      ...prev,
      teacherId: teacherData.teacher_id,
      titleTh: teacherData.title_th,
      firstNameTh: teacherData.first_name_th,
      lastNameTh: teacherData.last_name_th,
      firstNameEn: teacherData.first_name_en,
      lastNameEn: teacherData.last_name_en,
      address: teacherData.address,
      phone: teacherData.phone,
      subject: teacherData.subject,
      homeroomClass: teacherData.homeroom_class,
    } : prev));
  };

  const handleBatchUpload = async (data) => {
    console.log('📋 PersonnelManagement handleBatchUpload called with:', data);
    try {
      if (data.file && onAddStudentsBatch) {
        console.log('✅ Calling onAddStudentsBatch with file:', data.file.name);
        // ส่ง file (schoolId และ classroomId ไม่จำเป็นสำหรับ API)
        await onAddStudentsBatch(data.file);
        console.log('🎉 Upload completed!');
      } else {
        console.warn('❌ Missing required data:', {
          hasFile: !!data.file,
          hasOnAddStudentsBatch: !!onAddStudentsBatch
        });
      }
      setShowBatchUploadForm(false);
    } catch (error) {
      console.error('Failed to upload students:', error);
      alert('เกิดข้อผิดพลาดในการอัพโหลดข้อมูล: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-md">
      {deleteStudentDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '28px 32px',
            minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>ลบนักเรียน</h3>
            <p style={{ margin: '0 0 24px', color: '#555', fontSize: 14 }}>ต้องการลบอะไรบ้าง?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => confirmDeleteStudent(false)} style={{ padding: '10px 0', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                ลบเฉพาะนักเรียน
              </button>
              <button onClick={() => confirmDeleteStudent(true)} style={{ padding: '10px 0', background: '#f44336', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                ลบนักเรียน + บัญชีผู้ใช้
              </button>
              <button onClick={() => setDeleteStudentDialog(null)} style={{ padding: '10px 0', background: '#eee', color: '#555', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14 }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2.5 mb-8 border-b-2 border-gray-200">
        <button
          className={`px-6 py-3 bg-transparent border-none border-b-[3px] cursor-pointer text-base font-medium transition-all -mb-0.5 ${activeTab === 'students' ? 'text-[#2563eb] border-b-[#2563eb]' : 'text-gray-500 border-b-transparent hover:text-[#2563eb]'}`}
          onClick={() => setActiveTab('students')}
        >
          นักเรียน ({school.classrooms.reduce((sum, c) => sum + c.students.length, 0)} คน)
        </button>
        <button
          className={`px-6 py-3 bg-transparent border-none border-b-[3px] cursor-pointer text-base font-medium transition-all -mb-0.5 ${activeTab === 'teachers' ? 'text-[#2563eb] border-b-[#2563eb]' : 'text-gray-500 border-b-transparent hover:text-[#2563eb]'}`}
          onClick={() => setActiveTab('teachers')}
        >
          ครู ({school.teachers.length} คน)
        </button>
        <button
          className={`px-6 py-3 bg-transparent border-none border-b-[3px] cursor-pointer text-base font-medium transition-all -mb-0.5 ${activeTab === 'schedule' ? 'text-[#2563eb] border-b-[#2563eb]' : 'text-gray-500 border-b-transparent hover:text-[#2563eb]'}`}
          onClick={() => setActiveTab('schedule')}
        >
          ระบบจัดการตารางสอน
        </button>
        <button
          className={`px-6 py-3 bg-transparent border-none border-b-[3px] cursor-pointer text-base font-medium transition-all -mb-0.5 ${activeTab === 'behavior' ? 'text-[#2563eb] border-b-[#2563eb]' : 'text-gray-500 border-b-transparent hover:text-[#2563eb]'}`}
          onClick={() => setActiveTab('behavior')}
        >
          คะแนนพฤติกรรม
        </button>
      </div>

      {activeTab === 'students' && (
        <div>
          {/* Section header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="m-0 text-gray-800 text-xl">ห้องเรียน</h2>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <button
                  onClick={() => setShowAddStudentMenu(!showAddStudentMenu)}
                  className="px-5 py-2.5 bg-[#4caf50] text-white border-none rounded-md cursor-pointer font-medium hover:bg-[#45a049]"
                >
                  + เพิ่มนักเรียน
                </button>
                {showAddStudentMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[220px] z-[100] overflow-hidden">
                    <button
                      onClick={() => {
                        setShowManualAddForm(true);
                        setShowNewClassroomFlow(false);
                        setShowBatchUploadForm(false);
                        setManualAddClassroomId(school.classrooms[0]?.id?.toString() || '');
                        setShowAddStudentMenu(false);
                      }}
                      className="block w-full px-4 py-3 bg-white border-none text-left cursor-pointer text-sm text-gray-800 hover:bg-gray-50"
                    >
                      กรอกข้อมูลเอง
                    </button>
                    <button
                      onClick={() => {
                        setShowNewClassroomFlow(true);
                        setShowManualAddForm(false);
                        setShowBatchUploadForm(false);
                        setNewClassroomName('');
                        setNewClassroomStudents([emptyStudent()]);
                        setShowAddStudentMenu(false);
                      }}
                      className="block w-full px-4 py-3 bg-white border-none text-left cursor-pointer text-sm text-gray-800 hover:bg-gray-50"
                    >
                      สร้างห้องเรียนใหม่ + เพิ่มนักเรียน
                    </button>
                    <button
                      onClick={() => {
                        setShowBatchUploadForm(true);
                        setShowManualAddForm(false);
                        setShowNewClassroomFlow(false);
                        setShowAddStudentMenu(false);
                      }}
                      className="block w-full px-4 py-3 bg-white border-none text-left cursor-pointer text-sm text-gray-800 hover:bg-gray-50"
                    >
                      อัพโหลดไฟล์ (Excel/CSV)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showManualAddForm && (
            <div className="bg-[#f9f9f9] border border-gray-200 rounded-lg p-4 mb-4">
              {school.classrooms.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>ยังไม่มีห้องเรียน กรุณาเลือก "สร้างห้องเรียนใหม่ + เพิ่มนักเรียน" แทน</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <button
                      className="px-5 py-2.5 bg-[#4caf50] text-white border-none rounded-md cursor-pointer font-medium hover:bg-[#45a049]"
                      onClick={() => {
                        setShowManualAddForm(false);
                        setShowNewClassroomFlow(true);
                        setNewClassroomName('');
                        setNewClassroomStudents([emptyStudent()]);
                      }}
                    >
                      สร้างห้องเรียนใหม่
                    </button>
                    <button className="px-5 py-2.5 bg-gray-500 text-white border-none rounded-md cursor-pointer font-medium hover:bg-gray-600" onClick={() => setShowManualAddForm(false)}>
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 pb-3 border-b border-gray-200 mb-3">
                    <label className="font-semibold text-gray-600 text-sm">ห้องเรียน</label>
                    <select
                      value={manualAddClassroomId}
                      onChange={(e) => setManualAddClassroomId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      {school.classrooms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <StudentForm
                    onSubmit={(data) => {
                      if (!manualAddClassroomId) return;
                      handleAddStudent(data, parseInt(manualAddClassroomId));
                    }}
                    onCancel={() => setShowManualAddForm(false)}
                    multiMode
                  />
                </>
              )}
            </div>
          )}

          {showNewClassroomFlow && (
            <div className="bg-[#f9f9f9] border border-gray-200 rounded-lg p-4 mb-4">
              <h3 style={{ marginBottom: 12 }}>สร้างห้องเรียนใหม่ + เพิ่มนักเรียน</h3>

              <div className="flex flex-col gap-2 pb-3 border-b border-gray-200 mb-3">
                <label className="font-semibold text-gray-600 text-sm">ชื่อห้องเรียน *</label>
                <input
                  type="text"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  placeholder="เช่น ม.1/1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  รายชื่อนักเรียน
                </label>
                {newClassroomStudents.map((student, index) => (
                  <div key={index} className="flex items-start gap-2 mb-2.5 p-2.5 bg-gray-100 rounded-md">
                    <span className="text-[13px] font-semibold text-gray-600 min-w-[52px] pt-2">คนที่ {index + 1}</span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      <input
                        type="text"
                        placeholder="รหัสนักเรียน *"
                        value={student.studentId}
                        onChange={(e) => {
                          const updated = [...newClassroomStudents];
                          updated[index] = { ...updated[index], studentId: e.target.value };
                          setNewClassroomStudents(updated);
                        }}
                        className="flex-[1_1_140px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px]"
                      />
                      <input
                        type="number"
                        placeholder="เลขที่ *"
                        value={student.studentNumber}
                        onChange={(e) => {
                          const updated = [...newClassroomStudents];
                          updated[index] = { ...updated[index], studentNumber: e.target.value };
                          setNewClassroomStudents(updated);
                        }}
                        className="flex-[1_1_140px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px]"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อ (ไทย) *"
                        value={student.firstNameTh}
                        onChange={(e) => {
                          const updated = [...newClassroomStudents];
                          updated[index] = { ...updated[index], firstNameTh: e.target.value };
                          setNewClassroomStudents(updated);
                        }}
                        className="flex-[1_1_140px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px]"
                      />
                      <input
                        type="text"
                        placeholder="นามสกุล (ไทย) *"
                        value={student.lastNameTh}
                        onChange={(e) => {
                          const updated = [...newClassroomStudents];
                          updated[index] = { ...updated[index], lastNameTh: e.target.value };
                          setNewClassroomStudents(updated);
                        }}
                        className="flex-[1_1_140px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px]"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อ (อังกฤษ)"
                        value={student.firstNameEn}
                        onChange={(e) => {
                          const updated = [...newClassroomStudents];
                          updated[index] = { ...updated[index], firstNameEn: e.target.value };
                          setNewClassroomStudents(updated);
                        }}
                        className="flex-[1_1_140px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px]"
                      />
                      <input
                        type="text"
                        placeholder="นามสกุล (อังกฤษ)"
                        value={student.lastNameEn}
                        onChange={(e) => {
                          const updated = [...newClassroomStudents];
                          updated[index] = { ...updated[index], lastNameEn: e.target.value };
                          setNewClassroomStudents(updated);
                        }}
                        className="flex-[1_1_140px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px]"
                      />
                      <input
                        type="tel"
                        placeholder="เบอร์โทรศัพท์"
                        value={student.phone}
                        onChange={(e) => {
                          const updated = [...newClassroomStudents];
                          updated[index] = { ...updated[index], phone: e.target.value };
                          setNewClassroomStudents(updated);
                        }}
                        className="flex-[1_1_140px] px-2.5 py-1.5 border border-gray-300 rounded text-[13px]"
                      />
                    </div>
                    {newClassroomStudents.length > 1 && (
                      <button
                        type="button"
                        className="bg-transparent border-none text-[#e53935] text-base cursor-pointer px-1.5 py-1 leading-none"
                        onClick={() => setNewClassroomStudents(newClassroomStudents.filter((_, i) => i !== index))}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 bg-transparent border border-dashed border-[#2196F3] text-[#2196F3] px-3.5 py-1.5 rounded-md cursor-pointer text-[13px] hover:bg-[#e3f2fd]"
                  onClick={() => setNewClassroomStudents([...newClassroomStudents, emptyStudent()])}
                >
                  + เพิ่มนักเรียนอีกคน
                </button>
              </div>

              <div className="flex gap-2.5 justify-end pt-4 mt-4" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="px-5 py-2.5 bg-[#4caf50] text-white border-none rounded-md cursor-pointer font-medium hover:bg-[#45a049]"
                  onClick={async () => {
                    if (!newClassroomName.trim()) {
                      alert('กรุณากรอกชื่อห้องเรียน');
                      return;
                    }
                    try {
                      const created = await onAddClassroom({ name: newClassroomName.trim() });
                      console.log('🏫 created from onAddClassroom:', created);
                      if (created?.id) {
                        const validStudents = newClassroomStudents.filter(s => s.studentId && s.firstNameTh && s.lastNameTh);
                        for (const s of validStudents) {
                          await onAddStudent(created.id, { ...s, studentNumber: parseInt(s.studentNumber) || 0 }, created.grade, created.section);
                        }
                      }
                      setShowNewClassroomFlow(false);
                      setNewClassroomName('');
                      setNewClassroomStudents([emptyStudent()]);
                    } catch (err) {
                      alert('เกิดข้อผิดพลาด: ' + err.message);
                    }
                  }}
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 bg-gray-500 text-white border-none rounded-md cursor-pointer font-medium hover:bg-gray-600"
                  onClick={() => {
                    setShowNewClassroomFlow(false);
                    setNewClassroomName('');
                    setNewClassroomStudents([emptyStudent()]);
                  }}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {showBatchUploadForm && (
            <StudentBatchUploadForm
              onSubmit={handleBatchUpload}
              onCancel={() => setShowBatchUploadForm(false)}
            />
          )}

          {/* Classrooms grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-5">
            {school.classrooms.map((classroom) => {
              // หาครูประจำชั้นจาก homeroom_class
              const homeroomTeacher = school.teachers.find(
                teacher => teacher.homeroomClass === classroom.name
              );

              return (
                <div key={classroom.id} className="bg-[#fafafa] p-5 rounded-xl border-2 border-gray-200 transition-all hover:border-[#2563eb] hover:shadow-[0_4px_12px_rgba(102,126,234,0.1)]">
                  {/* Classroom header */}
                  <div className="flex justify-between items-center mb-4 pb-2.5 border-b-2 border-[#2563eb]">
                    <h3 className="m-0 text-gray-800 text-xl">{classroom.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-sm font-medium">{classroom.students.length} คน</span>
                      <button
                        className="bg-transparent border-none text-[#e53935] text-base cursor-pointer px-1.5 py-1 leading-none"
                        title="ลบห้องเรียน"
                        onClick={() => {
                          const studentCount = classroom.students.length;
                          const msg = studentCount > 0
                            ? `ห้องเรียน "${classroom.name}" มีนักเรียน ${studentCount} คน\n\nต้องการลบห้องเรียนและนักเรียนทั้งหมดในห้องหรือไม่?`
                            : `ต้องการลบห้องเรียน "${classroom.name}" หรือไม่?`;
                          if (window.confirm(msg)) {
                            onDeleteClassroom(classroom.id, studentCount > 0);
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {homeroomTeacher && (
                    <div className="px-3 py-2 bg-[#f0f7ff] border-l-[3px] border-[#2196F3] my-2 text-[0.9em] text-gray-800">
                      <strong className="text-[#2196F3] mr-2">👨‍🏫 ครูประจำชั้น:</strong> {homeroomTeacher.titleTh} {homeroomTeacher.firstNameTh} {homeroomTeacher.lastNameTh}
                    </div>
                  )}

                  {/* Students list */}
                  <div className="my-4 max-h-[500px] overflow-y-auto">
                    {classroom.students.map((student) => (
                      <div key={student.id} className="flex justify-between items-start p-4 bg-white border border-gray-100 rounded-lg mb-2.5 transition-all hover:border-[#2563eb] hover:shadow-sm">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setSelectedStudent({ studentId: student.studentId, dbId: student.id, classroomId: classroom.id })}
                        >
                          <div className="font-semibold text-gray-800 text-base mb-1 hover:text-[#2563eb]">
                            {student.studentNumber ?? '-'}. {student.firstNameTh} {student.lastNameTh}
                          </div>
                          <div className="text-xs text-gray-500 my-0.5">รหัส: {student.studentId}</div>
                          <div className="text-xs text-gray-500 my-0.5">
                            {student.firstNameEn} {student.lastNameEn}
                          </div>
                          <div className="text-xs text-gray-500 my-0.5">Tel: {student.phone}</div>
                        </div>
                        <button
                          onClick={() => setSelectedStudent({ studentId: student.studentId, dbId: student.id, classroomId: classroom.id })}
                          className="px-4 py-2 bg-[#ff9800] text-white border-none rounded-md cursor-pointer text-sm font-medium mr-1 hover:bg-[#f57c00]"
                        >
                          ดูข้อมูล
                        </button>
                        <button
                          onClick={async () => {
                            const current = student.studentNumber ?? '';
                            const input = window.prompt(
                              `แก้เลขที่นักเรียน "${student.firstNameTh} ${student.lastNameTh}"\n(ใส่เลขจำนวนเต็ม หรือว่างเพื่อล้าง)`,
                              String(current)
                            );
                            if (input === null) return; // user cancelled
                            const trimmed = input.trim();
                            let value = null;
                            if (trimmed !== '') {
                              const n = parseInt(trimmed, 10);
                              if (isNaN(n) || n < 1) {
                                alert('กรุณาใส่เลขจำนวนเต็มที่มากกว่า 0');
                                return;
                              }
                              value = n;
                            }
                            try {
                              await onUpdateStudent(classroom.id, student.id, { student_number: value });
                            } catch (err) {
                              alert('แก้ไขเลขที่ล้มเหลว: ' + (err.message || err));
                            }
                          }}
                          className="px-4 py-2 bg-[#ff9800] text-white border-none rounded-md cursor-pointer text-sm font-medium mr-1 hover:bg-[#f57c00]"
                        >
                          แก้เลขที่
                        </button>
                        <button
                          onClick={() => setDeleteStudentDialog({ classroomId: classroom.id, studentId: student.id })}
                          className="px-3 py-2 bg-[#f44336] text-white border-none rounded-md cursor-pointer text-[13px] font-medium flex-shrink-0 ml-2.5 hover:bg-[#da190b]"
                        >
                          ลบ
                        </button>
                      </div>
                    ))}

                    {classroom.students.length === 0 && (
                      <p className="text-center text-gray-400 py-5 italic text-sm">ยังไม่มีนักเรียนในห้องนี้</p>
                    )}
                  </div>

                  {showAddStudentForm === classroom.id ? (
                    <StudentForm
                      onSubmit={(data) => handleAddStudent(data, classroom.id)}
                      onCancel={() => setShowAddStudentForm(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowAddStudentForm(classroom.id)}
                      className="w-full py-3 bg-[#4caf50] text-white border-none rounded-lg cursor-pointer mt-2.5 font-medium text-sm hover:bg-[#45a049]"
                    >
                      + เพิ่มนักเรียน
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {school.classrooms.length === 0 && (
            <div className="text-center py-16 px-5 text-gray-400 text-lg bg-[#fafafa] rounded-xl border-2 border-dashed border-gray-300">
              <p>ยังไม่มีห้องเรียนในโรงเรียนนี้</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'teachers' && (
        <div>
          {/* Section header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="m-0 text-gray-800 text-xl">รายชื่อครู</h2>
            <button
              onClick={() => {
                setShowAddTeacherForm(!showAddTeacherForm);
                setEditingTeacher(null);
              }}
              className="px-5 py-2.5 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none rounded-md cursor-pointer font-medium"
            >
              {showAddTeacherForm ? 'ยกเลิก' : '+ เพิ่มครู'}
            </button>
          </div>

          {showAddTeacherForm && (
            <TeacherForm
              onSubmit={handleAddTeacher}
              onCancel={() => {
                setShowAddTeacherForm(false);
                setEditingTeacher(null);
              }}
              classrooms={school.classrooms || []}
              schoolId={school.id}
              editingTeacher={editingTeacher}
            />
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-5">
            {school.teachers.map((teacher) => (
              <div key={teacher.id} className="bg-[#fafafa] p-5 rounded-xl border-2 border-gray-200 flex justify-between items-start transition-all hover:border-[#2563eb] hover:shadow-[0_4px_12px_rgba(102,126,234,0.1)]">
                <div
                  className="flex-1 cursor-pointer hover:text-[#2563eb]"
                  onClick={() => setSelectedTeacher(teacher)}
                >
                  <h4 className="m-0 mb-1 text-gray-800 text-xl">{teacher.titleTh} {teacher.firstNameTh} {teacher.lastNameTh}</h4>
                  <p className="text-xs text-gray-500 my-0.5">รหัส: {teacher.teacherCode || '-'}</p>
                  <p className="text-sm text-gray-500 italic mb-2.5">{teacher.firstNameEn} {teacher.lastNameEn}</p>
                  <p className="text-xs text-gray-500 my-0.5">ที่อยู่: {teacher.address}</p>
                  <p className="text-xs text-gray-500 my-0.5">Tel: {teacher.phone}</p>
                  {teacher.subject && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <strong className="text-gray-600 text-sm block mb-2">วิชาที่สอน:</strong>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-[13px] font-medium">{teacher.subject}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => setSelectedTeacher(teacher)}
                    className="px-4 py-2 bg-[#ff9800] text-white border-none rounded-md cursor-pointer text-sm font-medium hover:bg-[#f57c00]"
                  >
                    ดูข้อมูล
                  </button>
                  <button
                    onClick={() => onDeleteTeacher(teacher.id)}
                    className="px-4 py-2 bg-[#f44336] text-white border-none rounded-md cursor-pointer text-sm font-medium hover:bg-[#da190b]"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {school.teachers.length === 0 && (
            <div className="text-center py-16 px-5 text-gray-400 text-lg bg-[#fafafa] rounded-xl border-2 border-dashed border-gray-300">
              <p>ยังไม่มีครูในโรงเรียนนี้</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div>
          <ScheduleManagement school={school} />
        </div>
      )}

      {activeTab === 'behavior' && (
        <div>
          <BehaviorManagement />
        </div>
      )}

      <StudentDetailModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        studentId={selectedStudent?.dbId}
        onUpdate={handleStudentUpdate}
      />

      <TeacherDetailModal
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        teacher={selectedTeacher}
        classrooms={school.classrooms || []}
        schoolId={school.id}
        schoolName={school.name}
        onUpdate={handleTeacherDetailUpdate}
      />
    </div>
  );
};

export default PersonnelManagement;
