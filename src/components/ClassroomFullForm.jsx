'use client';

import { useState } from 'react';

const inputCls = 'px-3 py-2.5 border-2 border-[#ddd] rounded-md text-sm transition-all font-[inherit] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]';
const textareaCls = `${inputCls} resize-y min-h-[60px]`;

const ClassroomFullForm = ({ onSubmit, onCancel, teachers }) => {
  const [classroomData, setClassroomData] = useState({
    name: '',
    homeroomTeacherId: null
  });

  const [students, setStudents] = useState([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [currentStudent, setCurrentStudent] = useState({
    studentId: '',
    studentNumber: '',
    firstNameTh: '',
    lastNameTh: '',
    firstNameEn: '',
    lastNameEn: '',
    address: '',
    phone: '',
    fatherName: '',
    motherName: ''
  });

  const [newTeachers, setNewTeachers] = useState([]);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState({
    firstNameTh: '',
    lastNameTh: '',
    firstNameEn: '',
    lastNameEn: '',
    address: '',
    phone: '',
    subjects: ''
  });

  const handleClassroomChange = (e) => {
    const { name, value } = e.target;
    setClassroomData(prev => ({
      ...prev,
      [name]: name === 'homeroomTeacherId' ? (value === '' ? null : parseInt(value)) : value
    }));
  };

  const handleStudentChange = (e) => {
    const { name, value } = e.target;
    setCurrentStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeacherChange = (e) => {
    const { name, value } = e.target;
    setCurrentTeacher(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    const newStudent = {
      ...currentStudent,
      id: Date.now(),
      studentNumber: parseInt(currentStudent.studentNumber)
    };
    setStudents([...students, newStudent]);
    setCurrentStudent({
      studentId: '',
      studentNumber: '',
      firstNameTh: '',
      lastNameTh: '',
      firstNameEn: '',
      lastNameEn: '',
      address: '',
      phone: '',
      fatherName: '',
      motherName: ''
    });
    setShowStudentForm(false);
  };

  const handleAddTeacher = (e) => {
    e.preventDefault();
    const newTeacher = {
      ...currentTeacher,
      id: Date.now(),
      subjects: currentTeacher.subjects.split(',').map(s => s.trim()).filter(s => s)
    };
    setNewTeachers([...newTeachers, newTeacher]);
    setCurrentTeacher({
      firstNameTh: '',
      lastNameTh: '',
      firstNameEn: '',
      lastNameEn: '',
      address: '',
      phone: '',
      subjects: ''
    });
    setShowTeacherForm(false);
  };

  const handleRemoveStudent = (studentId) => {
    setStudents(students.filter(s => s.id !== studentId));
  };

  const handleRemoveTeacher = (teacherId) => {
    setNewTeachers(newTeachers.filter(t => t.id !== teacherId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      classroom: classroomData,
      students: students,
      teachers: newTeachers
    });
  };

  return (
    <form className="flex flex-col gap-[25px]" onSubmit={handleSubmit}>
      {/* Section: ข้อมูลห้องเรียน */}
      <div className="bg-[#f9f9f9] p-5 rounded-[10px] border-2 border-[#eee]">
        <h3 className="m-0 mb-5 text-[#333] text-[18px] font-semibold flex items-center gap-2">📚 ข้อมูลห้องเรียน</h3>
        <div className="grid gap-[15px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="flex flex-col">
            <label className="mb-1.5 font-medium text-[#555] text-sm">ครูประจำชั้น</label>
            <select
              name="homeroomTeacherId"
              value={classroomData.homeroomTeacherId || ''}
              onChange={handleClassroomChange}
              className={`${inputCls} cursor-pointer bg-white`}
            >
              <option value="">-- เลือกครูประจำชั้น --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstNameTh} {teacher.lastNameTh} ({teacher.subject || ''})
                </option>
              ))}
              {newTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstNameTh} {teacher.lastNameTh} ({teacher.subject || ''})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section: เพิ่มครูใหม่ */}
      <div className="bg-[#f9f9f9] p-5 rounded-[10px] border-2 border-[#eee]">
        <div className="flex justify-between items-center mb-[15px] max-md:flex-col max-md:items-start max-md:gap-2.5">
          <h3 className="m-0 text-[#333] text-[18px] font-semibold flex items-center gap-2">👨‍🏫 เพิ่มครูใหม่ ({newTeachers.length} คน)</h3>
          <button
            type="button"
            onClick={() => setShowTeacherForm(!showTeacherForm)}
            className="px-5 py-2.5 bg-[#4caf50] text-white border-none rounded-md cursor-pointer font-medium text-sm transition-colors hover:bg-[#45a049] max-md:w-full"
          >
            {showTeacherForm ? 'ยกเลิก' : '+ เพิ่มครู'}
          </button>
        </div>

        {showTeacherForm && (
          <div className="bg-white p-5 rounded-lg border-2 border-[#4caf50] mb-[15px]">
            <div className="grid gap-[15px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ชื่อ (ไทย) *</label>
                <input className={inputCls} type="text" name="firstNameTh" value={currentTeacher.firstNameTh} onChange={handleTeacherChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">นามสกุล (ไทย) *</label>
                <input className={inputCls} type="text" name="lastNameTh" value={currentTeacher.lastNameTh} onChange={handleTeacherChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ชื่อ (อังกฤษ) *</label>
                <input className={inputCls} type="text" name="firstNameEn" value={currentTeacher.firstNameEn} onChange={handleTeacherChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">นามสกุล (อังกฤษ) *</label>
                <input className={inputCls} type="text" name="lastNameEn" value={currentTeacher.lastNameEn} onChange={handleTeacherChange} required />
              </div>
              <div className="flex flex-col col-span-full">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ที่อยู่ *</label>
                <textarea className={textareaCls} name="address" value={currentTeacher.address} onChange={handleTeacherChange} rows="2" required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">เบอร์โทรศัพท์ *</label>
                <input className={inputCls} type="tel" name="phone" value={currentTeacher.phone} onChange={handleTeacherChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">วิชาที่สอน * (คั่นด้วยเครื่องหมาย ,)</label>
                <input className={inputCls} type="text" name="subjects" value={currentTeacher.subjects} onChange={handleTeacherChange} placeholder="เช่น คณิตศาสตร์, วิทยาศาสตร์" required />
              </div>
            </div>
            <div className="flex justify-end mt-[15px] pt-[15px] border-t-2 border-[#eee] max-md:justify-stretch">
              <button
                type="button"
                onClick={handleAddTeacher}
                className="px-6 py-2.5 bg-[#4caf50] text-white border-none rounded-md cursor-pointer font-medium text-sm transition-colors hover:bg-[#45a049] max-md:w-full"
              >
                ✓ เพิ่มครูนี้
              </button>
            </div>
          </div>
        )}

        <div className="mt-[15px] flex flex-col gap-2.5">
          {newTeachers.length === 0 && !showTeacherForm && (
            <p className="text-center text-[#999] py-[30px] italic text-sm bg-white rounded-lg border-2 border-dashed border-[#ddd]">ยังไม่มีครูที่เพิ่มใหม่</p>
          )}
          {newTeachers.map((teacher) => (
            <div key={teacher.id} className="flex justify-between items-start p-[15px] bg-white border-2 border-[#eee] rounded-lg transition-all hover:border-[#2563eb] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <div className="flex-1">
                <div className="font-semibold text-[#333] text-[15px] mb-[5px]">{teacher.firstNameTh} {teacher.lastNameTh}</div>
                <div className="text-[13px] text-[#666] my-0.5">{teacher.firstNameEn} {teacher.lastNameEn}</div>
                <div className="text-[13px] text-[#666] my-0.5">วิชาที่สอน: {teacher.subject || ''}</div>
                <div className="text-[13px] text-[#666] my-0.5">Tel: {teacher.phone}</div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveTeacher(teacher.id)}
                className="px-3 py-1.5 bg-[#f44336] text-white border-none rounded-[5px] cursor-pointer text-base font-semibold transition-colors hover:bg-[#da190b] shrink-0 ml-2.5 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section: รายชื่อนักเรียน */}
      <div className="bg-[#f9f9f9] p-5 rounded-[10px] border-2 border-[#eee]">
        <div className="flex justify-between items-center mb-[15px] max-md:flex-col max-md:items-start max-md:gap-2.5">
          <h3 className="m-0 text-[#333] text-[18px] font-semibold flex items-center gap-2">👨‍🎓 รายชื่อนักเรียน ({students.length} คน)</h3>
          <button
            type="button"
            onClick={() => setShowStudentForm(!showStudentForm)}
            className="px-5 py-2.5 bg-[#4caf50] text-white border-none rounded-md cursor-pointer font-medium text-sm transition-colors hover:bg-[#45a049] max-md:w-full"
          >
            {showStudentForm ? 'ยกเลิก' : '+ เพิ่มนักเรียน'}
          </button>
        </div>

        {showStudentForm && (
          <div className="bg-white p-5 rounded-lg border-2 border-[#4caf50] mb-[15px]">
            <div className="grid gap-[15px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">รหัสนักเรียน *</label>
                <input className={inputCls} type="text" name="studentId" value={currentStudent.studentId} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">เลขที่ *</label>
                <input className={inputCls} type="number" name="studentNumber" value={currentStudent.studentNumber} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ชื่อ (ไทย) *</label>
                <input className={inputCls} type="text" name="firstNameTh" value={currentStudent.firstNameTh} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">นามสกุล (ไทย) *</label>
                <input className={inputCls} type="text" name="lastNameTh" value={currentStudent.lastNameTh} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ชื่อ (อังกฤษ) *</label>
                <input className={inputCls} type="text" name="firstNameEn" value={currentStudent.firstNameEn} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">นามสกุล (อังกฤษ) *</label>
                <input className={inputCls} type="text" name="lastNameEn" value={currentStudent.lastNameEn} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col col-span-full">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ที่อยู่ *</label>
                <textarea className={textareaCls} name="address" value={currentStudent.address} onChange={handleStudentChange} rows="2" required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">เบอร์โทรศัพท์ *</label>
                <input className={inputCls} type="tel" name="phone" value={currentStudent.phone} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ชื่อบิดา *</label>
                <input className={inputCls} type="text" name="fatherName" value={currentStudent.fatherName} onChange={handleStudentChange} required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1.5 font-medium text-[#555] text-sm">ชื่อมารดา *</label>
                <input className={inputCls} type="text" name="motherName" value={currentStudent.motherName} onChange={handleStudentChange} required />
              </div>
            </div>
            <div className="flex justify-end mt-[15px] pt-[15px] border-t-2 border-[#eee] max-md:justify-stretch">
              <button
                type="button"
                onClick={handleAddStudent}
                className="px-6 py-2.5 bg-[#4caf50] text-white border-none rounded-md cursor-pointer font-medium text-sm transition-colors hover:bg-[#45a049] max-md:w-full"
              >
                ✓ เพิ่มนักเรียนนี้
              </button>
            </div>
          </div>
        )}

        <div className="mt-[15px] flex flex-col gap-2.5">
          {students.length === 0 && !showStudentForm && (
            <p className="text-center text-[#999] py-[30px] italic text-sm bg-white rounded-lg border-2 border-dashed border-[#ddd]">ยังไม่มีนักเรียนในห้องนี้</p>
          )}
          {students.map((student) => (
            <div key={student.id} className="flex justify-between items-start p-[15px] bg-white border-2 border-[#eee] rounded-lg transition-all hover:border-[#2563eb] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <div className="flex-1">
                <div className="font-semibold text-[#333] text-[15px] mb-[5px]">{student.studentNumber}. {student.firstNameTh} {student.lastNameTh}</div>
                <div className="text-[13px] text-[#666] my-0.5">รหัส: {student.studentId}</div>
                <div className="text-[13px] text-[#666] my-0.5">{student.firstNameEn} {student.lastNameEn}</div>
                <div className="text-[13px] text-[#666] my-0.5">Tel: {student.phone}</div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveStudent(student.id)}
                className="px-3 py-1.5 bg-[#f44336] text-white border-none rounded-[5px] cursor-pointer text-base font-semibold transition-colors hover:bg-[#da190b] shrink-0 ml-2.5 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Form actions */}
      <div className="flex gap-2.5 justify-end pt-5 border-t-[3px] border-[#ddd] max-md:flex-col-reverse">
        <button
          type="submit"
          className="px-8 py-3.5 bg-[#2563eb] text-white border-none rounded-lg cursor-pointer font-semibold text-base transition-colors hover:bg-[#5568d3] max-md:w-full"
        >
          ✓ บันทึกห้องเรียน
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3.5 bg-[#f5f5f5] text-[#666] border-2 border-[#ddd] rounded-lg cursor-pointer font-semibold text-base transition-all hover:bg-[#eee] hover:border-[#ccc] max-md:w-full"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
};

export default ClassroomFullForm;
