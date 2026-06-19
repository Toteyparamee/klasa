'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSchool } from '../context/SchoolContext';
import PersonnelManagement from '../components/PersonnelManagement';

const SchoolDetail = () => {
  const { schoolId } = useParams();
  const { schools, addStudent, addStudentsBatch, updateStudent, deleteStudent, addTeacher, updateTeacher, deleteTeacher, addClassroom, deleteClassroom } = useSchool();
  const router = useRouter();

  const school = schools.find(s => s.id === parseInt(schoolId));

  if (!school) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-5 bg-slate-50">
        <h2 className="text-gray-700">ไม่พบข้อมูลโรงเรียน</h2>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const handleAddStudent = (classroomId, studentData, grade, section) => {
    addStudent(school.id, classroomId, studentData, grade, section);
  };

  const handleDeleteStudent = (classroomId, studentId, deleteUser = false) => {
    return deleteStudent(school.id, classroomId, studentId, deleteUser);
  };

  const handleUpdateStudent = (classroomId, studentId, body) => {
    return updateStudent(school.id, classroomId, studentId, body);
  };

  const handleAddTeacher = (teacherData) => {
    addTeacher(school.id, teacherData);
  };

  const handleUpdateTeacher = (teacherData) => {
    updateTeacher(school.id, teacherData);
  };

  const handleDeleteTeacher = (teacherId) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบครูท่านนี้?')) {
      deleteTeacher(school.id, teacherId);
    }
  };

  const handleAddStudentsBatch = async (file) => {
    await addStudentsBatch(school.id, file);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer mb-4"
        >
          ← กลับ
        </button>
        <div>
          <h1 className="mt-2 mb-1 text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="m-0 text-sm text-gray-500">{school.address}</p>
        </div>
      </div>

      <div className="py-8 px-8 max-w-[1200px] mx-auto">
        <PersonnelManagement
          school={school}
          onAddStudent={handleAddStudent}
          onAddStudentsBatch={handleAddStudentsBatch}
          onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={handleDeleteStudent}
          onAddTeacher={handleAddTeacher}
          onUpdateTeacher={handleUpdateTeacher}
          onDeleteTeacher={handleDeleteTeacher}
          onAddClassroom={(data) => addClassroom(school.id, data)}
          onDeleteClassroom={(classroomId, force) => deleteClassroom(school.id, classroomId, force)}
        />
      </div>
    </div>
  );
};

export default SchoolDetail;
