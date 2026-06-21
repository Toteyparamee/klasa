'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import StudentForm from '../components/StudentForm';
import StudentDetailModal from '../components/StudentDetailModal';
import TeacherForm from '../components/TeacherForm';
import ClassroomForm from '../components/ClassroomForm';
import ClassroomFullForm from '../components/ClassroomFullForm';
import StudentBatchUploadForm from '../components/StudentBatchUploadForm';
import Modal from '../components/Modal';
import Sidebar from '../components/Sidebar';

// ดึง school_id จาก JWT payload
const getSchoolIdFromToken = () => {
  const token = sessionStorage.getItem('access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.school_id ?? null;
  } catch {
    return null;
  }
};

const PersonnelManagementPage = () => {
  console.log('🏫 PersonnelManagementPage rendered');

  const { schools, addStudent, addStudentsBatch, deleteStudent, updateStudent, addTeacher, deleteTeacher, addClassroom, updateClassroom, deleteClassroom } = useSchool();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const editorSchoolId = !isAdmin ? getSchoolIdFromToken() : null;
  const [activeTab, setActiveTab] = useState('students');
  const [selectedSchool, setSelectedSchool] = useState(
    !isAdmin && editorSchoolId ? editorSchoolId : schools[0]?.id || null
  );

  // สำหรับ editor — ล็อค school ให้เป็นของตัวเองเสมอ (กรณี schools โหลดทีหลัง)
  useEffect(() => {
    if (!isAdmin && editorSchoolId && selectedSchool !== editorSchoolId) {
      setSelectedSchool(editorSchoolId);
    }
  }, [isAdmin, editorSchoolId, selectedSchool]);
  const [showAddClassroomForm, setShowAddClassroomForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [showAddStudentForm, setShowAddStudentForm] = useState(null);
  const [showAddTeacherForm, setShowAddTeacherForm] = useState(false);
  const [showBatchUploadForm, setShowBatchUploadForm] = useState(false);
  const [selectedClassroomForUpload, setSelectedClassroomForUpload] = useState(null);
  const [viewStudentId, setViewStudentId] = useState(null);
  const [editNumberStudent, setEditNumberStudent] = useState(null); // { classroomId, studentId, currentNumber }
  const [editNumberValue, setEditNumberValue] = useState('');
  const editNumberRef = useRef(null);

  const school = schools.find(s => s.id === selectedSchool);

  const handleAddClassroom = (data) => {
    if (selectedSchool) {
      // เพิ่มครูใหม่ทั้งหมดก่อน
      data.teachers.forEach(teacher => {
        addTeacher(selectedSchool, teacher);
      });

      // สร้างชื่อห้องเรียนอัตโนมัติ
      const newClassroomId = school.classrooms.length > 0
        ? Math.max(...school.classrooms.map(c => c.id)) + 1
        : 1;

      const classroomName = `ห้อง ${newClassroomId}`;

      // เพิ่มห้องเรียนโดยใส่ชื่อห้องอัตโนมัติ
      addClassroom(selectedSchool, {
        ...data.classroom,
        name: classroomName
      });

      // เพิ่มนักเรียนทั้งหมดในห้องนี้
      data.students.forEach(student => {
        // ใช้ setTimeout เพื่อให้ห้องเรียนถูกสร้างก่อน
        setTimeout(() => {
          addStudent(selectedSchool, newClassroomId, student);
        }, 100);
      });

      setShowAddClassroomForm(false);
    }
  };

  const handleEditClassroom = async (classroomData) => {
    if (selectedSchool && editingClassroom) {
      try {
        await updateClassroom(selectedSchool, editingClassroom.id, classroomData);
        setEditingClassroom(null);
      } catch (err) {
        alert('แก้ไขห้องเรียนไม่สำเร็จ: ' + (err.message || err));
      }
    }
  };

  const handleAddStudent = (studentData, classroomId) => {
    if (selectedSchool) {
      addStudent(selectedSchool, classroomId, studentData);
      setShowAddStudentForm(null);
    }
  };

  const handleBatchUpload = useCallback(async (data) => {
    console.log('📋📋📋 handleBatchUpload ENTERED!', {
      data,
      selectedSchool,
      selectedClassroomForUpload,
      hasFile: !!data?.file,
      hasProgressCallback: !!data?.onProgress,
      timestamp: new Date().toISOString()
    });

    try {
      if (selectedSchool && selectedClassroomForUpload && data.file) {
        console.log('✅ Conditions met, calling addStudentsBatch...');
        await addStudentsBatch(selectedSchool, selectedClassroomForUpload, data.file, data.onProgress);
        console.log('🎉 addStudentsBatch completed!');
        setShowBatchUploadForm(false);
        setSelectedClassroomForUpload(null);
      } else {
        console.warn('❌ Conditions not met:', {
          selectedSchool: !!selectedSchool,
          selectedClassroomForUpload: !!selectedClassroomForUpload,
          hasFile: !!data?.file
        });
      }
    } catch (error) {
      console.error('💥 Failed to upload students:', error);
      alert('เกิดข้อผิดพลาดในการอัพโหลดข้อมูล: ' + error.message);
    }
  }, [selectedSchool, selectedClassroomForUpload, addStudentsBatch]);

  const handleAddTeacher = (teacherData) => {
    if (selectedSchool) {
      addTeacher(selectedSchool, teacherData);
      setShowAddTeacherForm(false);
    }
  };

  const [deleteStudentDialog, setDeleteStudentDialog] = useState(null);

  const handleDeleteStudent = (classroomId, studentId) => {
    setDeleteStudentDialog({ classroomId, studentId });
  };

  const confirmDeleteStudent = async (deleteUser) => {
    const { classroomId, studentId } = deleteStudentDialog;
    setDeleteStudentDialog(null);
    try {
      await deleteStudent(selectedSchool, classroomId, studentId, deleteUser);
    } catch (err) {
      alert('ลบนักเรียนไม่สำเร็จ: ' + (err.message || err));
    }
  };

  const handleDeleteTeacher = (teacherId) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบครูท่านนี้?') && selectedSchool) {
      deleteTeacher(selectedSchool, teacherId);
    }
  };

  const handleSaveStudentNumber = async (classroomId, studentId) => {
    const num = parseInt(editNumberValue);
    if (isNaN(num) || num < 1) { alert('กรุณากรอกเลขที่ที่ถูกต้อง'); return; }
    try {
      await updateStudent(selectedSchool, classroomId, studentId, { student_number: num });
      setEditNumberStudent(null);
    } catch (err) {
      alert('แก้เลขที่ไม่สำเร็จ: ' + (err.message || err));
    }
  };

  if (!school) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">จัดการบุคลากร</h1>
              <p className="text-sm text-gray-500 mt-1">จัดการนักเรียน ครู และห้องเรียน</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center py-16 text-gray-400">
              <p>ไม่พบข้อมูลโรงเรียนในระบบ</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentDetailModal
        isOpen={!!viewStudentId}
        onClose={() => setViewStudentId(null)}
        studentId={viewStudentId}
        onUpdate={async (body) => {
          if (viewStudentId) {
            const s = school?.classrooms.flatMap(c => c.students).find(s => s.id === viewStudentId);
            if (s) {
              const cls = school.classrooms.find(c => c.students.some(st => st.id === viewStudentId));
              await updateStudent(selectedSchool, cls?.id, viewStudentId, body);
            }
          }
        }}
      />
      {deleteStudentDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 min-w-[320px] shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ลบนักเรียน</h3>
            <p className="text-sm text-gray-500 mb-6">ต้องการลบอะไรบ้าง?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => confirmDeleteStudent(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
              >
                ลบเฉพาะนักเรียน
              </button>
              <button
                onClick={() => confirmDeleteStudent(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold border border-red-100 cursor-pointer transition-colors"
              >
                ลบนักเรียน + บัญชีผู้ใช้
              </button>
              <button
                onClick={() => setDeleteStudentDialog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
      <Sidebar />
      <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
        <div className="p-8">
          {/* Page header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการบุคลากร</h1>
              <p className="text-sm text-gray-500 mt-1">จัดการนักเรียน ครู และห้องเรียน</p>
            </div>
            {isAdmin && schools.length > 1 && (
              <div className="flex items-center gap-2.5">
                <label className="text-sm font-semibold text-gray-600">เลือกโรงเรียน:</label>
                <select
                  value={selectedSchool || ''}
                  onChange={(e) => setSelectedSchool(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white min-w-[250px]"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* School info banner */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{school.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{school.address}</p>
            <div className="flex gap-6 items-center pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">
                <strong className="text-blue-600 text-lg font-bold">{school.classrooms.length}</strong> ห้องเรียน
              </span>
              <span className="text-gray-200 text-xl">|</span>
              <span className="text-sm text-gray-600">
                <strong className="text-blue-600 text-lg font-bold">{school.classrooms.reduce((sum, c) => sum + c.students.length, 0)}</strong> นักเรียน
              </span>
              <span className="text-gray-200 text-xl">|</span>
              <span className="text-sm text-gray-600">
                <strong className="text-blue-600 text-lg font-bold">{school.teachers.length}</strong> ครู
              </span>
            </div>
          </div>

          {/* Personnel content */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-all ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('students')}
              >
                นักเรียน ({school.classrooms.reduce((sum, c) => sum + c.students.length, 0)} คน)
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none transition-all ${activeTab === 'teachers' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('teachers')}
              >
                ครู ({school.teachers.length} คน)
              </button>
            </div>

            {activeTab === 'students' && (
              <div>
                {/* Section header */}
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">ห้องเรียน</h2>
                  <button
                    onClick={() => {
                      setShowAddClassroomForm(true);
                      setEditingClassroom(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                  >
                    + เพิ่มห้องเรียน
                  </button>
                </div>

                <Modal
                  isOpen={showAddClassroomForm}
                  onClose={() => setShowAddClassroomForm(false)}
                  title="🏫 เพิ่มห้องเรียนใหม่"
                  size="large"
                >
                  <ClassroomFullForm
                    onSubmit={handleAddClassroom}
                    onCancel={() => setShowAddClassroomForm(false)}
                    teachers={school.teachers}
                  />
                </Modal>

                <Modal
                  isOpen={!!editingClassroom}
                  onClose={() => setEditingClassroom(null)}
                  title="✏️ แก้ไขห้องเรียน"
                  size="medium"
                >
                  <ClassroomForm
                    onSubmit={handleEditClassroom}
                    onCancel={() => setEditingClassroom(null)}
                    teachers={school.teachers}
                    initialData={editingClassroom}
                  />
                </Modal>

                <Modal
                  isOpen={showBatchUploadForm}
                  onClose={() => {
                    setShowBatchUploadForm(false);
                    setSelectedClassroomForUpload(null);
                  }}
                  title="📤 อัพโหลดข้อมูลนักเรียนจากไฟล์"
                  size="large"
                >
                  <StudentBatchUploadForm
                    onSubmit={handleBatchUpload}
                    onCancel={() => {
                      setShowBatchUploadForm(false);
                      setSelectedClassroomForUpload(null);
                    }}
                  />
                </Modal>

                {/* Classrooms grid */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-5">
                  {school.classrooms.map((classroom) => {
                    const homeroomTeacher = school.teachers.find(t => t.id === classroom.homeroomTeacherId);
                    return (
                      <div key={classroom.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all hover:border-blue-200 hover:shadow-md">
                        {/* Classroom header */}
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-gray-900">{classroom.name}</h3>
                            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">{classroom.students.length} คน</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingClassroom(classroom);
                                setShowAddClassroomForm(false);
                              }}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold border-none cursor-pointer transition-colors"
                              title="แก้ไขห้องเรียน"
                            >
                              ✏️ แก้ไข
                            </button>
                            <button
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-100 cursor-pointer transition-colors"
                              title="ลบห้องเรียน"
                              onClick={() => {
                                if (window.confirm(`ลบห้องเรียน "${classroom.name}" และนักเรียนทั้งหมดในห้อง?`)) {
                                  deleteClassroom(selectedSchool, classroom.id);
                                }
                              }}
                            >
                              ลบ
                            </button>
                          </div>
                        </div>

                        {homeroomTeacher && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl mb-4 border-l-4 border-blue-400">
                            <span className="font-semibold text-gray-600 text-xs">ครูประจำชั้น:</span>
                            <span className="text-blue-700 font-semibold text-sm">
                              {homeroomTeacher.firstNameTh} {homeroomTeacher.lastNameTh}
                            </span>
                          </div>
                        )}
                        {!homeroomTeacher && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl mb-4 border-l-4 border-amber-400">
                            <span className="font-semibold text-gray-600 text-xs">ครูประจำชั้น:</span>
                            <span className="text-amber-600 italic text-xs">ยังไม่ได้กำหนด</span>
                          </div>
                        )}

                        {/* Students list */}
                        <div className="my-4 max-h-[500px] overflow-y-auto">
                          {classroom.students.map((student) => (
                            <div key={student.id} className="flex justify-between items-start p-3 bg-slate-50 rounded-xl mb-2 transition-all hover:bg-blue-50 hover:shadow-sm">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                  {(student.firstNameTh || '?')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-800 text-sm mb-0.5">
                                    {editNumberStudent?.studentId === student.id ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <input
                                          ref={editNumberRef}
                                          type="number"
                                          min="1"
                                          value={editNumberValue}
                                          onChange={e => setEditNumberValue(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveStudentNumber(classroom.id, student.id);
                                            if (e.key === 'Escape') setEditNumberStudent(null);
                                          }}
                                          className="w-14 px-2 py-1 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-50"
                                          autoFocus
                                        />
                                        <button onClick={() => handleSaveStudentNumber(classroom.id, student.id)} className="px-2 py-1 bg-green-500 text-white border-none rounded-lg cursor-pointer text-xs font-semibold">✓</button>
                                        <button onClick={() => setEditNumberStudent(null)} className="px-2 py-1 bg-gray-400 text-white border-none rounded-lg cursor-pointer text-xs font-semibold">✕</button>
                                      </span>
                                    ) : (
                                      <>{student.studentNumber}. </>
                                    )}
                                    {student.firstNameTh} {student.lastNameTh}
                                  </div>
                                  <div className="text-xs text-gray-400">รหัส: {student.studentId}</div>
                                </div>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0 ml-2">
                                <button
                                  onClick={() => setViewStudentId(student.id)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold border-none cursor-pointer transition-colors"
                                >
                                  ดูข้อมูล
                                </button>
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditNumberStudent({ classroomId: classroom.id, studentId: student.id });
                                        setEditNumberValue(student.studentNumber ?? '');
                                      }}
                                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold border-none cursor-pointer transition-colors"
                                    >
                                      แก้เลขที่
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudent(classroom.id, student.id)}
                                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-100 cursor-pointer transition-colors"
                                    >
                                      ลบ
                                    </button>
                                  </>
                                )}
                              </div>
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
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => setShowAddStudentForm(classroom.id)}
                              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                            >
                              + เพิ่มนักเรียน
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClassroomForUpload(classroom.id);
                                setShowBatchUploadForm(true);
                              }}
                              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                              title="อัพโหลดไฟล์ Excel/CSV"
                            >
                              อัพโหลดไฟล์
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {school.classrooms.length === 0 && (
                  <div className="text-center py-16 text-gray-400 bg-slate-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p>ยังไม่มีห้องเรียนในโรงเรียนนี้</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teachers' && (
              <div>
                {/* Section header */}
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">รายชื่อครู</h2>
                  <button
                    onClick={() => setShowAddTeacherForm(!showAddTeacherForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors"
                  >
                    {showAddTeacherForm ? 'ยกเลิก' : '+ เพิ่มครู'}
                  </button>
                </div>

                {showAddTeacherForm && (
                  <TeacherForm
                    onSubmit={handleAddTeacher}
                    onCancel={() => setShowAddTeacherForm(false)}
                    classrooms={school.classrooms}
                    existingTeacherCodes={school.teachers.map(t => t.teacherCode || t.teacherId || '').filter(Boolean)}
                    schoolId={selectedSchool}
                  />
                )}

                <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-5">
                  {school.teachers.map((teacher) => {
                    return (
                      <div key={teacher.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-start transition-all hover:border-blue-200 hover:shadow-md">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-base font-bold flex-shrink-0">
                            {(teacher.firstNameTh || '?')[0]}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-bold text-gray-900 mb-0.5">{teacher.titleTh} {teacher.firstNameTh} {teacher.lastNameTh}</h4>
                            <p className="text-xs text-gray-400 mb-0.5">รหัส: {teacher.teacherCode || '-'}</p>
                            <p className="text-xs text-gray-400 italic mb-2">{teacher.firstNameEn} {teacher.lastNameEn}</p>
                            {teacher.address && (
                              <p className="text-xs text-gray-500 mb-0.5">ที่อยู่: {teacher.address}</p>
                            )}
                            {teacher.phone && (
                              <p className="text-xs text-gray-500 mb-0.5">Tel: {teacher.phone}</p>
                            )}
                            {teacher.homeroomClass && (
                              <p className="text-xs text-gray-500 mb-0.5">ห้องประจำชั้น: {teacher.homeroomClass}</p>
                            )}
                            {teacher.subject && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <strong className="text-gray-500 text-xs block mb-2">วิชาที่สอน:</strong>
                                <div className="flex flex-wrap gap-2">
                                  <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">{teacher.subject}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold border border-red-100 cursor-pointer flex-shrink-0 ml-3 transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                    );
                  })}
                </div>

                {school.teachers.length === 0 && (
                  <div className="text-center py-16 text-gray-400 bg-slate-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p>ยังไม่มีครูในโรงเรียนนี้</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonnelManagementPage;
