'use client';

import { useState, useEffect } from 'react';

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#2563eb] transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-600 mb-1';

const TeacherForm = ({ onSubmit, onCancel, classrooms = [], schoolId, editingTeacher, existingTeacherCodes = [] }) => {
  // รายการคำนำหน้า
  const titleOptions = ['นาย', 'นาง', 'นางสาว', 'ผศ.', 'อ.', 'ดร.'];

  // รายการวิชาที่ใช้ในโรงเรียน
  const availableSubjects = [
    'คณิตศาสตร์',
    'วิทยาศาสตร์',
    'ภาษาไทย',
    'ภาษาอังกฤษ',
    'สังคมศึกษา',
    'ประวัติศาสตร์',
    'สุขศึกษาและพลศึกษา',
    'ศิลปะ',
    'ดนตรี',
    'การงานอาชีพ',
    'คอมพิวเตอร์',
    'ภาษาจีน',
    'ภาษาญี่ปุ่น',
    'ภาษาฝรั่งเศส',
    'แนะแนว',
    'กิจกรรมพัฒนาผู้เรียน'
  ];

  const [formData, setFormData] = useState({
    teacher_code: '',
    title_th: '',
    first_name_th: '',
    last_name_th: '',
    first_name_en: '',
    last_name_en: '',
    address: '',
    phone: '',
    subject: '',
    homeroom_class: '',
    school_id: schoolId,
    username: '',
    password: '',
    email: ''
  });

  // Update school_id เมื่อ schoolId prop เปลี่ยน
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      school_id: schoolId
    }));
  }, [schoolId]);

  // Load data เมื่อแก้ไขครู
  useEffect(() => {
    if (editingTeacher) {
      setFormData({
        teacher_code: editingTeacher.teacherId || '',
        title_th: editingTeacher.titleTh || '',
        first_name_th: editingTeacher.firstNameTh || '',
        last_name_th: editingTeacher.lastNameTh || '',
        first_name_en: editingTeacher.firstNameEn || '',
        last_name_en: editingTeacher.lastNameEn || '',
        address: editingTeacher.address || '',
        phone: editingTeacher.phone || '',
        subject: editingTeacher.subject || '',
        homeroom_class: editingTeacher.homeroomClass || '',
        school_id: schoolId
      });
    }
  }, [editingTeacher, schoolId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.subject) {
      alert('กรุณาเลือกวิชาที่สอน');
      return;
    }

    if (!editingTeacher && existingTeacherCodes.includes(formData.teacher_code)) {
      alert(`รหัสครู "${formData.teacher_code}" มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น`);
      return;
    }

    if (editingTeacher) {
      onSubmit({ ...formData, id: editingTeacher.id });
    } else {
      onSubmit(formData);
    }

    // Reset form
    setFormData({
      teacher_code: '',
      title_th: '',
      first_name_th: '',
      last_name_th: '',
      first_name_en: '',
      last_name_en: '',
      address: '',
      phone: '',
      subject: '',
      homeroom_class: '',
      school_id: schoolId,
      username: '',
      password: '',
      email: ''
    });
  };

  return (
    <form className="bg-white p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] mb-5" onSubmit={handleSubmit}>
      <h3 className="mt-0 mb-5 text-gray-800 text-xl border-b-2 border-[#2563eb] pb-2">{editingTeacher ? 'แก้ไขข้อมูลครู' : 'เพิ่มครู'}</h3>

      <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
        <div className="flex flex-col">
          <label className={labelCls}>รหัสครู *</label>
          <input
            type="text"
            name="teacher_code"
            value={formData.teacher_code}
            onChange={handleChange}
            placeholder="เช่น T001"
            required
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>คำนำหน้า</label>
          <select
            name="title_th"
            value={formData.title_th}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="">-- เลือกคำนำหน้า --</option>
            {titleOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>ชื่อ (ไทย) *</label>
          <input
            type="text"
            name="first_name_th"
            value={formData.first_name_th}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>นามสกุล (ไทย) *</label>
          <input
            type="text"
            name="last_name_th"
            value={formData.last_name_th}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>ชื่อ (อังกฤษ)</label>
          <input
            type="text"
            name="first_name_en"
            value={formData.first_name_en}
            onChange={handleChange}
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>นามสกุล (อังกฤษ)</label>
          <input
            type="text"
            name="last_name_en"
            value={formData.last_name_en}
            onChange={handleChange}
            className={inputCls}
          />
        </div>

        <div className="flex flex-col col-span-2 max-sm:col-span-1">
          <label className={labelCls}>ที่อยู่</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            className={`${inputCls} resize-y min-h-[60px]`}
          />
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>เบอร์โทรศัพท์</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>วิชาที่สอน *</label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            className={inputCls}
          >
            <option value="">-- เลือกวิชา --</option>
            {availableSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>ห้องเรียนที่ปรึกษา</label>
          <select
            name="homeroom_class"
            value={formData.homeroom_class}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="">ไม่มีห้องประจำชั้น</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.name}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!editingTeacher && (
        <>
          <h4 style={{ marginTop: '16px', marginBottom: '8px' }}>บัญชีผู้ใช้งาน</h4>
          <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
            <div className="flex flex-col">
              <label className={labelCls}>ชื่อผู้ใช้ *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="username"
                required
                className={inputCls}
              />
            </div>

            <div className="flex flex-col">
              <label className={labelCls}>อีเมล *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
                className={inputCls}
              />
            </div>

            <div className="flex flex-col">
              <label className={labelCls}>รหัสผ่าน *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="รหัสผ่าน"
                required
                className={inputCls}
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2.5 justify-end">
        <button type="submit" className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white border-none rounded-lg cursor-pointer font-medium transition-colors duration-300">บันทึก</button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 bg-gray-400 hover:bg-gray-500 text-white border-none rounded-lg cursor-pointer font-medium transition-colors duration-300">ยกเลิก</button>
      </div>
    </form>
  );
};

export default TeacherForm;
