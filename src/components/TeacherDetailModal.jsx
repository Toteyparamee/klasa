'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { userAPI } from '../api/authApi';
import { getToken } from '../api/config';

const titleOptions = ['นาย', 'นาง', 'นางสาว', 'ผศ.', 'อ.', 'ดร.'];

const availableSubjects = [
  'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ',
  'สังคมศึกษา', 'ประวัติศาสตร์', 'สุขศึกษาและพลศึกษา',
  'ศิลปะ', 'ดนตรี', 'การงานอาชีพ', 'คอมพิวเตอร์',
  'ภาษาจีน', 'ภาษาญี่ปุ่น', 'ภาษาฝรั่งเศส',
  'แนะแนว', 'กิจกรรมพัฒนาผู้เรียน',
];

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1976d2] transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-600 mb-1';

const TeacherDetailModal = ({
  isOpen,
  onClose,
  teacher,
  classrooms = [],
  schoolId,
  schoolName,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Password tab state
  const [userAccount, setUserAccount] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [gmailInput, setGmailInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (isOpen && teacher) {
      setFormData({
        teacher_id: teacher.teacherId || teacher.teacherCode || '',
        title_th: teacher.titleTh || '',
        first_name_th: teacher.firstNameTh || '',
        last_name_th: teacher.lastNameTh || '',
        first_name_en: teacher.firstNameEn || '',
        last_name_en: teacher.lastNameEn || '',
        address: teacher.address || '',
        phone: teacher.phone || '',
        subject: teacher.subject || '',
        homeroom_class: teacher.homeroomClass || '',
      });
    }
    if (!isOpen) {
      setActiveTab('general');
      setIsEditing(false);
      setUserAccount(null);
      setUsername('');
      setGmailInput('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setPasswordMsg(null);
    }
  }, [isOpen, teacher]);

  const fetchUserAccount = async () => {
    const code = teacher?.teacherCode || teacher?.teacherId;
    if (!code) return;
    setUserLoading(true);
    try {
      const token = getToken();
      const res = await userAPI.getUsers(token);
      const users = res.data || res;
      const found = users.find(
        (u) => u.username === code || u.teacher_code === code
      );
      setUserAccount(found || null);
      setUsername(found?.username || code);
      setGmailInput(found?.email || '');
    } catch (err) {
      console.error('Failed to fetch user account:', err);
      setUserAccount(null);
      setUsername(code);
      setGmailInput('');
    } finally {
      setUserLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'password' && !userAccount && teacher) {
      fetchUserAccount();
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      teacher_id: teacher.teacherId || teacher.teacherCode || '',
      title_th: teacher.titleTh || '',
      first_name_th: teacher.firstNameTh || '',
      last_name_th: teacher.lastNameTh || '',
      first_name_en: teacher.firstNameEn || '',
      last_name_en: teacher.lastNameEn || '',
      address: teacher.address || '',
      phone: teacher.phone || '',
      subject: teacher.subject || '',
      homeroom_class: teacher.homeroomClass || '',
    });
    setIsEditing(false);
  };

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formData.first_name_th?.trim() || !formData.last_name_th?.trim()) {
      alert('กรุณากรอกชื่อและนามสกุล (ไทย)');
      return;
    }
    if (!formData.subject) {
      alert('กรุณาเลือกวิชาที่สอน');
      return;
    }
    if (!onUpdate) return;

    setSaving(true);
    try {
      await onUpdate({ ...formData, id: teacher.id });
      setIsEditing(false);
    } catch (err) {
      alert('บันทึกล้มเหลว: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    const trimmedUsername = (username || '').trim();
    if (!trimmedUsername) {
      setPasswordMsg({ type: 'error', text: 'กรุณากรอก Username' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'รหัสผ่านไม่ตรงกัน' });
      return;
    }

    const code = teacher?.teacherCode || teacher?.teacherId;

    setPasswordSaving(true);
    try {
      const token = getToken();
      const trimmedGmail = (gmailInput || '').trim();
      if (userAccount) {
        const body = { password: newPassword };
        if (trimmedUsername !== userAccount.username) {
          body.username = trimmedUsername;
        }
        if (trimmedGmail && trimmedGmail !== userAccount.email) {
          body.email = trimmedGmail;
        }
        const res = await userAPI.updateUser(userAccount.id, body, token);
        const updated = res?.data || res;
        if (updated && typeof updated === 'object') {
          setUserAccount((prev) => ({ ...(prev || {}), ...updated, username: trimmedUsername }));
        } else {
          setUserAccount((prev) => prev ? { ...prev, username: trimmedUsername } : prev);
        }
        setPasswordMsg({ type: 'success', text: 'อัปเดตบัญชีและรหัสผ่านสำเร็จ' });
      } else {
        await userAPI.createUser(
          {
            username: trimmedUsername,
            password: newPassword,
            email: trimmedGmail || `${trimmedUsername}@teacher.local`,
            role: 'teacher',
            first_name: teacher.firstNameTh,
            last_name: teacher.lastNameTh,
            teacher_code: code,
            schoolId: schoolId != null ? String(schoolId) : '',
            schoolName: schoolName || '',
          },
          token
        );
        setPasswordMsg({ type: 'success', text: 'สร้างบัญชีผู้ใช้และตั้งรหัสผ่านสำเร็จ' });
        fetchUserAccount();
      }
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาด' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const renderInfoRow = (label, value) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 gap-3">
      <span className="text-[#757575] text-sm shrink-0 min-w-[140px]">{label}</span>
      <span className="text-[#212121] text-sm font-medium text-right break-words">{value || '-'}</span>
    </div>
  );

  const editInputCls = 'flex-1 px-2.5 py-1.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-[#1976d2] focus:shadow-[0_0_0_3px_rgba(25,118,210,0.1)]';

  const renderEditRow = (label, key, type = 'text') => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 gap-3" key={key}>
      <span className="text-[#757575] text-sm shrink-0 min-w-[140px]">{label}</span>
      <input
        type={type}
        className={editInputCls}
        value={formData[key] ?? ''}
        onChange={(e) => handleFieldChange(key, e.target.value)}
      />
    </div>
  );

  const renderSelectRow = (label, key, options, allowEmpty = true) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 gap-3" key={key}>
      <span className="text-[#757575] text-sm shrink-0 min-w-[140px]">{label}</span>
      <select
        className={editInputCls}
        value={formData[key] ?? ''}
        onChange={(e) => handleFieldChange(key, e.target.value)}
      >
        {allowEmpty && <option value="">-- เลือก --</option>}
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  );

  const sectionTitleCls = 'text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200 first:mt-0';
  const saveBtnCls = 'px-6 py-2.5 bg-[#1976d2] hover:bg-[#1565c0] disabled:bg-gray-300 disabled:cursor-not-allowed text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors';

  const renderGeneralTab = () => {
    if (isEditing) {
      return (
        <div>
          <h3 className={sectionTitleCls}>ข้อมูลส่วนตัว</h3>
          {renderEditRow('รหัสครู', 'teacher_id')}
          {renderSelectRow('คำนำหน้า', 'title_th', titleOptions)}
          {renderEditRow('ชื่อ (ไทย) *', 'first_name_th')}
          {renderEditRow('นามสกุล (ไทย) *', 'last_name_th')}
          {renderEditRow('ชื่อ (อังกฤษ)', 'first_name_en')}
          {renderEditRow('นามสกุล (อังกฤษ)', 'last_name_en')}

          <h3 className={sectionTitleCls}>ข้อมูลติดต่อ</h3>
          {renderEditRow('เบอร์โทรศัพท์', 'phone', 'tel')}
          {renderEditRow('ที่อยู่', 'address')}

          <h3 className={sectionTitleCls}>ข้อมูลการสอน</h3>
          {renderSelectRow('วิชาที่สอน *', 'subject', availableSubjects)}
          {renderSelectRow(
            'ห้องเรียนที่ปรึกษา',
            'homeroom_class',
            classrooms.map((c) => ({ value: c.name, label: c.name }))
          )}
        </div>
      );
    }
    return (
      <div>
        <h3 className={sectionTitleCls}>ข้อมูลส่วนตัว</h3>
        {renderInfoRow('รหัสครู', teacher.teacherCode || teacher.teacherId)}
        {renderInfoRow(
          'ชื่อ-นามสกุล (ไทย)',
          `${teacher.titleTh || ''} ${teacher.firstNameTh || ''} ${teacher.lastNameTh || ''}`.trim()
        )}
        {renderInfoRow(
          'ชื่อ-นามสกุล (อังกฤษ)',
          `${teacher.firstNameEn || ''} ${teacher.lastNameEn || ''}`.trim() || '-'
        )}

        <h3 className={sectionTitleCls}>ข้อมูลติดต่อ</h3>
        {renderInfoRow('เบอร์โทรศัพท์', teacher.phone)}
        {renderInfoRow('ที่อยู่', teacher.address)}

        <h3 className={sectionTitleCls}>ข้อมูลการสอน</h3>
        {renderInfoRow('วิชาที่สอน', teacher.subject)}
        {renderInfoRow('ห้องเรียนที่ปรึกษา', teacher.homeroomClass || 'ไม่มี')}
      </div>
    );
  };

  const renderPasswordTab = () => {
    if (userLoading) {
      return (
        <div className="flex flex-col items-center p-10 text-gray-500">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1976d2] rounded-full animate-spin mb-4"></div>
          <p>กำลังตรวจสอบบัญชีผู้ใช้...</p>
        </div>
      );
    }

    const code = teacher?.teacherCode || teacher?.teacherId;

    return (
      <div>
        <div className="mb-5">
          {userAccount ? (
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-green-50 border border-green-300">
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold shrink-0">&#10003;</div>
              <div>
                <p className="m-0 mb-1 font-semibold text-[15px] text-gray-800">มีบัญชีผู้ใช้แล้ว</p>
                <p className="my-0.5 text-[13px] text-gray-600">
                  Username: <strong>{userAccount.username}</strong>
                </p>
                {userAccount.email && (
                  <p className="my-0.5 text-[13px] text-gray-600">Email: {userAccount.email}</p>
                )}
                {userAccount.role && (
                  <p className="my-0.5 text-[13px] text-gray-600">Role: {userAccount.role}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-orange-50 border border-orange-300">
              <div className="w-10 h-10 rounded-full bg-orange-400 text-white flex items-center justify-center text-xl font-bold shrink-0">!</div>
              <div>
                <p className="m-0 mb-1 font-semibold text-[15px] text-gray-800">ยังไม่มีบัญชีผู้ใช้</p>
                <p className="my-0.5 text-[13px] text-gray-600">
                  ระบบจะสร้างบัญชีใหม่โดยใช้รหัสครู <strong>{code || '-'}</strong> เป็น Username
                </p>
              </div>
            </div>
          )}
        </div>

        <h3 className={sectionTitleCls}>
          {userAccount ? 'แก้ไขบัญชีและรหัสผ่าน' : 'สร้างบัญชีและตั้งรหัสผ่าน'}
        </h3>

        <form onSubmit={handleSetPassword} className="max-w-[400px]">
          <div className="mb-4">
            <label className={labelCls}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอก username"
              required
              className={inputCls}
            />
          </div>
          <div className="mb-4">
            <label className={labelCls}>Gmail {userAccount ? '' : '(ไม่บังคับ)'}</label>
            {userAccount ? (
              <input
                type="email"
                value={gmailInput}
                onChange={(e) => setGmailInput(e.target.value)}
                placeholder="กรอก Gmail"
                className={inputCls}
              />
            ) : (
              <input
                type="email"
                value={gmailInput}
                onChange={(e) => setGmailInput(e.target.value)}
                placeholder="กรอก Gmail (ไม่บังคับ)"
                className={inputCls}
              />
            )}
          </div>
          <div className="mb-4">
            <label className={labelCls}>รหัสผ่านใหม่</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่"
              required
              minLength={4}
              className={inputCls}
            />
          </div>
          <div className="mb-4">
            <label className={labelCls}>ยืนยันรหัสผ่าน</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              required
              minLength={4}
              className={inputCls}
            />
          </div>

          <label className="flex items-center gap-2 text-[13px] text-gray-600 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="w-4 h-4"
            />
            แสดงรหัสผ่าน
          </label>

          {passwordMsg && (
            <div className={`px-3.5 py-2.5 rounded-lg text-sm mb-4 ${
              passwordMsg.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-300'
                : 'bg-red-50 text-red-800 border border-red-300'
            }`}>{passwordMsg.text}</div>
          )}

          <button type="submit" className={saveBtnCls} disabled={passwordSaving}>
            {passwordSaving
              ? 'กำลังบันทึก...'
              : userAccount
              ? 'บันทึกการเปลี่ยนแปลง'
              : 'สร้างบัญชีผู้ใช้'}
          </button>
        </form>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ข้อมูลครู" size="medium">
      {teacher && (
        <>
          <div className="flex items-center gap-4 pb-5 mb-5 border-b-2 border-gray-200 max-sm:flex-col max-sm:text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-300 to-blue-700 text-white flex items-center justify-center text-2xl font-bold shrink-0">
              <span>{teacher.firstNameTh?.charAt(0) || '?'}</span>
            </div>
            <div>
              <h3 className="m-0 mb-1 text-xl text-gray-800">
                {teacher.titleTh} {teacher.firstNameTh} {teacher.lastNameTh}
              </h3>
              <p className="m-0 text-gray-500 text-sm">
                รหัส: {teacher.teacherCode || teacher.teacherId || '-'}
              </p>
              {teacher.subject && (
                <p className="mt-0.5 m-0 text-[#1976d2] text-sm font-medium">วิชา: {teacher.subject}</p>
              )}
            </div>
            {activeTab !== 'password' && (
              <div className="ml-auto flex gap-2 max-sm:ml-0">
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className={saveBtnCls}
                    style={{ background: '#1976d2' }}
                  >
                    แก้ไข
                  </button>
                ) : (
                  <>
                    <button onClick={handleSave} className={saveBtnCls} disabled={saving}>
                      {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={saveBtnCls}
                      style={{ background: '#9e9e9e' }}
                      disabled={saving}
                    >
                      ยกเลิก
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-5 max-sm:flex-wrap max-sm:justify-center">
            {[
              { key: 'general', label: 'ข้อมูลทั่วไป' },
              { key: 'password', label: 'บัญชี & รหัสผ่าน' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`px-5 py-2 border-none rounded-[20px] text-sm cursor-pointer transition-all font-medium ${
                  activeTab === tab.key
                    ? 'bg-[#1976d2] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="animate-[fadeIn_0.2s_ease-in]">
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'password' && renderPasswordTab()}
          </div>
        </>
      )}
    </Modal>
  );
};

export default TeacherDetailModal;
