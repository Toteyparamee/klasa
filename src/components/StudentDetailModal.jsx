'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { studentAPI } from '../api/personnelApi';
import { userAPI } from '../api/authApi';
import { schoolAPI } from '../api/schoolApi';
import { getToken, API_CONFIG } from '../api/config';

// upload รูปโปรไฟล์ไปยัง upload-service (เหมือน mobile app)
const uploadProfileImage = async (file, studentCode) => {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(
    `${API_CONFIG.BASE_URLS.PERSONNEL}/api/upload/profile/${studentCode}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || json.error || 'Upload failed');
  }
  const path = json.data?.url;
  if (!path) throw new Error('Upload response missing url');
  return path.startsWith('http') ? path : `${API_CONFIG.BASE_URLS.PERSONNEL}${path}`;
};

// fetch รูปด้วย JWT แล้วคืนเป็น blob URL (เพื่อให้ <img src> ใช้งานได้)
const fetchImageAsBlobUrl = async (url) => {
  const token = getToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

const PROFILE_KEY = (code) => `profile_image_url_${code}`;

// fields ที่ส่งเป็นตัวเลขเข้า backend (parseFloat ก่อนส่ง)
const NUMBER_FIELDS = new Set([
  'student_number', 'child_order',
  'older_brothers', 'younger_brothers', 'older_sisters', 'younger_sisters',
  'weight', 'height', 'travel_time',
  'father_monthly_income', 'mother_monthly_income', 'guardian_monthly_income',
  'distance_paved_road', 'distance_unpaved_road',
  'latitude', 'longitude',
]);

// fields ที่ระบบไม่ให้แก้ (backend ก็ strip ออกอยู่แล้ว แต่ block ที่ frontend ก่อน)
const READONLY_FIELDS = new Set(['id', 'student_code', 'created_at', 'updated_at', 'deleted_at']);

const dateInputValue = (iso) => {
  if (!iso) return '';
  return String(iso).split('T')[0];
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#2563eb] transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-600 mb-1';

const StudentDetailModal = ({ isOpen, onClose, studentId, onUpdate }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // โปรไฟล์รูป
  const [profileBlobUrl, setProfileBlobUrl] = useState(null);   // blob ของรูปที่บันทึกไว้ (สำหรับ <img>)
  const [pickedFile, setPickedFile] = useState(null);            // ไฟล์ที่เลือกใหม่ระหว่าง edit
  const [pickedBlobUrl, setPickedBlobUrl] = useState(null);      // blob preview ของไฟล์ที่เลือก

  // Password tab state
  const [userAccount, setUserAccount] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [gmailInput, setGmailInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudent();
    }
    if (!isOpen) {
      setStudent(null);
      setActiveTab('general');
      setUserAccount(null);
      setNewUsername('');
      setGmailInput('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg(null);
      setIsEditing(false);
      setFormData({});
      // cleanup blob URLs ทั้งหมด
      setProfileBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setPickedBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setPickedFile(null);
    }
  }, [isOpen, studentId]);

  // โหลดรูปโปรไฟล์ (URL cached ใน localStorage เหมือน mobile app) แล้วแปลงเป็น blob URL
  useEffect(() => {
    const code = student?.student_code;
    if (!code) return;
    const cachedUrl = localStorage.getItem(PROFILE_KEY(code));
    if (!cachedUrl) {
      setProfileBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    let cancelled = false;
    let createdBlobUrl = null;
    fetchImageAsBlobUrl(cachedUrl).then(blobUrl => {
      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        return;
      }
      createdBlobUrl = blobUrl;
      setProfileBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return blobUrl;
      });
    });
    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [student?.student_code]);

  const fetchStudent = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await studentAPI.getStudent(studentId, token);
      const data = res.data || res;
      setStudent(data);
      setFormData(data);
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลนักเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatAge = (age) => {
    if (!age) return '-';
    const parts = [];
    if (age.years) parts.push(`${age.years} ปี`);
    if (age.months) parts.push(`${age.months} เดือน`);
    if (age.days) parts.push(`${age.days} วัน`);
    return parts.length > 0 ? parts.join(' ') : '-';
  };

  const formatAddress = (s) => {
    if (!s) return '-';
    const parts = [];
    if (s.house_number) parts.push(`${s.house_number}`);
    if (s.village_no) parts.push(`หมู่ ${s.village_no}`);
    if (s.road) parts.push(`ถ.${s.road}`);
    if (s.sub_district) parts.push(`ต.${s.sub_district}`);
    if (s.district) parts.push(`อ.${s.district}`);
    if (s.province) parts.push(`จ.${s.province}`);
    if (s.postal_code) parts.push(s.postal_code);
    return parts.length > 0 ? parts.join(' ') : '-';
  };

  const fetchUserAccount = async () => {
    if (!student?.student_code) return;
    setUserLoading(true);
    try {
      const token = getToken();
      const res = await userAPI.getUsers(token);
      const users = res.data || res;
      const found = users.find(u => u.student_code === student.student_code);
      setUserAccount(found || null);
      setGmailInput(found?.email || '');
      if (!found) setNewUsername(student.student_code || '');
    } catch (err) {
      console.error('Failed to fetch user account:', err);
      setUserAccount(null);
      setGmailInput('');
      setNewUsername(student.student_code || '');
    } finally {
      setUserLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'password' && !userAccount && student) {
      fetchUserAccount();
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'รหัสผ่านไม่ตรงกัน' });
      return;
    }

    setPasswordSaving(true);
    try {
      const token = getToken();
      const trimmedGmail = (gmailInput || '').trim();
      if (userAccount) {
        const body = { password: newPassword };
        if (trimmedGmail && trimmedGmail !== userAccount.email) {
          body.email = trimmedGmail;
        }
        await userAPI.updateUser(userAccount.id, body, token);
        setUserAccount((prev) => prev ? { ...prev, email: trimmedGmail || prev.email } : prev);
        setPasswordMsg({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จ' });
      } else {
        const username = (newUsername || '').trim();
        if (!username) {
          setPasswordMsg({ type: 'error', text: 'กรุณากรอก Username' });
          setPasswordSaving(false);
          return;
        }
        const schoolId = student.school_id != null ? String(student.school_id) : '';
        let schoolName = '';
        if (schoolId) {
          try {
            const schoolRes = await schoolAPI.getSchool(schoolId, token);
            schoolName = (schoolRes.data || schoolRes)?.name || '';
          } catch (err) {
            console.warn('Failed to fetch school name:', err);
          }
        }
        await userAPI.createUser({
          username,
          password: newPassword,
          email: trimmedGmail || `${username}@student.local`,
          role: 'student',
          first_name: student.first_name_th,
          last_name: student.last_name_th,
          student_code: student.student_code,
          schoolId,
          schoolName,
        }, token);
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

  // ---- Edit mode handlers ----

  const handleStartEdit = () => {
    setFormData(student || {});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(student || {});
    setIsEditing(false);
    // ทิ้งรูปที่เลือกใหม่
    setPickedBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPickedFile(null);
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handlePickProfile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // เคลียร์เพื่อให้เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      alert('รองรับเฉพาะไฟล์ jpg, png, webp');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์มีขนาดเกิน 10MB');
      return;
    }
    setPickedBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setPickedFile(file);
  };

  const handleSave = async () => {
    // build diff: เฉพาะ field ที่เปลี่ยน, ไม่รวม readonly fields
    const body = {};
    for (const [key, newVal] of Object.entries(formData)) {
      if (READONLY_FIELDS.has(key)) continue;
      const oldVal = student?.[key];
      const normalizedNew = newVal === '' ? null : newVal;
      const normalizedOld = oldVal === '' || oldVal === undefined ? null : oldVal;
      if (JSON.stringify(normalizedNew) === JSON.stringify(normalizedOld)) continue;

      if (NUMBER_FIELDS.has(key)) {
        if (normalizedNew === null) {
          body[key] = null;
        } else {
          const n = Number(normalizedNew);
          if (Number.isNaN(n)) {
            alert(`ค่าของ "${key}" ต้องเป็นตัวเลข`);
            return;
          }
          body[key] = n;
        }
      } else {
        body[key] = normalizedNew;
      }
    }

    const hasFieldChanges = Object.keys(body).length > 0;
    const hasNewImage = !!pickedFile;
    if (!hasFieldChanges && !hasNewImage) {
      setIsEditing(false);
      return;
    }
    if (hasFieldChanges && !onUpdate) {
      alert('ไม่สามารถบันทึกข้อมูลได้: ระบบไม่ได้ตั้งค่า callback');
      return;
    }

    setSaving(true);
    try {
      // 1) อัปโหลดรูปก่อน (ถ้ามีไฟล์ใหม่) — เก็บ URL ไว้ใน localStorage เหมือน mobile app
      if (hasNewImage && student?.student_code) {
        const url = await uploadProfileImage(pickedFile, student.student_code);
        localStorage.setItem(PROFILE_KEY(student.student_code), url);
        // โหลดรูปใหม่เป็น blob เพื่อแสดงผล
        const blobUrl = await fetchImageAsBlobUrl(url);
        setProfileBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return blobUrl; });
        setPickedBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        setPickedFile(null);
      }

      // 2) บันทึก fields อื่นๆ
      if (hasFieldChanges) {
        await onUpdate(body);
        await fetchStudent();
      }

      setIsEditing(false);
    } catch (err) {
      alert('บันทึกล้มเหลว: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // ---- Render helpers ----

  const renderInfoRow = (label, value) => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100">
      <span className="text-[#757575] text-sm shrink-0 min-w-[140px]">{label}</span>
      <span className="text-[#212121] text-sm font-medium text-right break-words">{value || '-'}</span>
    </div>
  );

  const renderEditRow = (label, key, type = 'text') => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100" key={key}>
      <span className="text-[#757575] text-sm shrink-0 min-w-[140px]">{label}</span>
      <input
        type={type}
        className="sdm-edit-input"
        value={type === 'date' ? dateInputValue(formData[key]) : (formData[key] ?? '')}
        onChange={(e) => handleFieldChange(key, e.target.value)}
        style={{
          flex: 1,
          padding: '6px 10px',
          border: '1px solid #ccc',
          borderRadius: 4,
          fontSize: 14,
        }}
      />
    </div>
  );

  const renderGeneralTab = () => {
    if (isEditing) {
      return (
        <div>
          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200 first:mt-0">ข้อมูลส่วนตัว</h3>
          {renderEditRow('เลขบัตรประชาชน', 'national_id')}
          {renderEditRow('คำนำหน้า (ไทย)', 'title_th')}
          {renderEditRow('ชื่อ (ไทย)', 'first_name_th')}
          {renderEditRow('นามสกุล (ไทย)', 'last_name_th')}
          {renderEditRow('ชื่อ (อังกฤษ)', 'first_name_en')}
          {renderEditRow('นามสกุล (อังกฤษ)', 'last_name_en')}
          {renderEditRow('เพศ', 'gender')}
          {renderEditRow('วันเกิด', 'birth_date', 'date')}
          {renderEditRow('กรุ๊ปเลือด', 'blood_type')}
          {renderEditRow('สัญชาติ', 'nationality')}
          {renderEditRow('เชื้อชาติ', 'ethnicity')}
          {renderEditRow('ศาสนา', 'religion')}
          {renderEditRow('จังหวัดที่เกิด', 'birth_province')}
          {renderEditRow('เบอร์โทรศัพท์', 'current_phone')}

          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลการศึกษา</h3>
          {renderEditRow('เลขที่ในห้อง', 'student_number', 'number')}
          {renderEditRow('ชั้น', 'grade')}
          {renderEditRow('ห้อง', 'section')}
          {renderEditRow('น้ำหนัก (กก.)', 'weight', 'number')}
          {renderEditRow('ส่วนสูง (ซม.)', 'height', 'number')}
        </div>
      );
    }
    return (
      <div>
        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200 first:mt-0">ข้อมูลส่วนตัว</h3>
        {renderInfoRow('เลขบัตรประชาชน', student.national_id || '-')}
        {renderInfoRow('ชื่อ-นามสกุล (ไทย)', `${student.title_th || ''} ${student.first_name_th || ''} ${student.last_name_th || ''}`.trim())}
        {renderInfoRow('ชื่อ-นามสกุล (อังกฤษ)', `${student.first_name_en || ''} ${student.last_name_en || ''}`.trim() || '-')}
        {renderInfoRow('รหัสนักเรียน', student.student_code)}
        {renderInfoRow('เพศ', student.gender)}
        {renderInfoRow('วันเกิด', formatDate(student.birth_date))}
        {renderInfoRow('อายุ', formatAge(student.age))}
        {renderInfoRow('กรุ๊ปเลือด', student.blood_type)}
        {renderInfoRow('สัญชาติ', student.nationality)}
        {renderInfoRow('เชื้อชาติ', student.ethnicity)}
        {renderInfoRow('ศาสนา', student.religion)}
        {renderInfoRow('จังหวัดที่เกิด', student.birth_province)}
        {renderInfoRow('เบอร์โทรศัพท์', student.current_phone)}

        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลการศึกษา</h3>
        {renderInfoRow('ชั้น/ห้อง', `${student.grade || '-'}/${student.section || '-'}`)}
        {renderInfoRow('เลขที่', student.student_number ?? '-')}
        {renderInfoRow('น้ำหนัก', student.weight ? `${student.weight} กก.` : '-')}
        {renderInfoRow('ส่วนสูง', student.height ? `${student.height} ซม.` : '-')}
      </div>
    );
  };

  const renderAddressTab = () => {
    if (isEditing) {
      return (
        <div>
          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200 first:mt-0">ที่อยู่ตามทะเบียนบ้าน</h3>
          {renderEditRow('บ้านเลขที่', 'house_number')}
          {renderEditRow('หมู่', 'village_no')}
          {renderEditRow('ถนน', 'road')}
          {renderEditRow('ตำบล', 'sub_district')}
          {renderEditRow('อำเภอ', 'district')}
          {renderEditRow('จังหวัด', 'province')}
          {renderEditRow('รหัสไปรษณีย์', 'postal_code')}
          {renderEditRow('เบอร์โทรศัพท์', 'current_phone')}

          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลการเดินทาง</h3>
          {renderEditRow('ระยะทาง (ถนนลาดยาง) กม.', 'distance_paved_road', 'number')}
          {renderEditRow('ระยะทาง (ถนนลูกรัง) กม.', 'distance_unpaved_road', 'number')}
          {renderEditRow('เวลาเดินทาง (นาที)', 'travel_time', 'number')}
          {renderEditRow('วิธีการเดินทาง', 'travel_method')}
        </div>
      );
    }
    return (
      <div>
        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200 first:mt-0">ที่อยู่ตามทะเบียนบ้าน</h3>
        {renderInfoRow('ที่อยู่', formatAddress(student))}
        {renderInfoRow('เบอร์โทรศัพท์', student.current_phone)}

        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลการเดินทาง</h3>
        {renderInfoRow('ระยะทาง (ถนนลาดยาง)', student.distance_paved_road ? `${student.distance_paved_road} กม.` : '-')}
        {renderInfoRow('ระยะทาง (ถนนลูกรัง)', student.distance_unpaved_road ? `${student.distance_unpaved_road} กม.` : '-')}
        {renderInfoRow('เวลาเดินทาง', student.travel_time ? `${student.travel_time} นาที` : '-')}
        {renderInfoRow('วิธีการเดินทาง', student.travel_method)}
      </div>
    );
  };

  const renderFamilyTab = () => {
    if (isEditing) {
      return (
        <div>
          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200 first:mt-0">ข้อมูลบิดา</h3>
          {renderEditRow('คำนำหน้า', 'father_title')}
          {renderEditRow('ชื่อ', 'father_first_name')}
          {renderEditRow('นามสกุล', 'father_last_name')}
          {renderEditRow('อาชีพ', 'father_occupation')}
          {renderEditRow('เบอร์โทรศัพท์', 'father_phone')}
          {renderEditRow('รายได้ต่อเดือน (บาท)', 'father_monthly_income', 'number')}

          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลมารดา</h3>
          {renderEditRow('คำนำหน้า', 'mother_title')}
          {renderEditRow('ชื่อ', 'mother_first_name')}
          {renderEditRow('นามสกุล', 'mother_last_name')}
          {renderEditRow('อาชีพ', 'mother_occupation')}
          {renderEditRow('เบอร์โทรศัพท์', 'mother_phone')}

          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลผู้ปกครอง</h3>
          {renderEditRow('คำนำหน้า', 'guardian_title')}
          {renderEditRow('ชื่อ', 'guardian_first_name')}
          {renderEditRow('นามสกุล', 'guardian_last_name')}
          {renderEditRow('ความสัมพันธ์', 'guardian_relationship')}
          {renderEditRow('อาชีพ', 'guardian_occupation')}
          {renderEditRow('เบอร์โทรศัพท์', 'guardian_phone')}
          {renderEditRow('รายได้ต่อเดือน (บาท)', 'guardian_monthly_income', 'number')}

          <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลพี่น้อง</h3>
          {renderEditRow('เป็นบุตรคนที่', 'child_order', 'number')}
          {renderEditRow('พี่ชาย', 'older_brothers', 'number')}
          {renderEditRow('น้องชาย', 'younger_brothers', 'number')}
          {renderEditRow('พี่สาว', 'older_sisters', 'number')}
          {renderEditRow('น้องสาว', 'younger_sisters', 'number')}
          {renderEditRow('สถานภาพบิดามารดา', 'parents_marital_status')}
        </div>
      );
    }
    return (
      <div>
        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200 first:mt-0">ข้อมูลบิดา</h3>
        {renderInfoRow('ชื่อ-นามสกุล', `${student.father_title || ''} ${student.father_first_name || ''} ${student.father_last_name || ''}`.trim() || '-')}
        {renderInfoRow('อาชีพ', student.father_occupation)}
        {renderInfoRow('เบอร์โทรศัพท์', student.father_phone)}
        {renderInfoRow('รายได้ต่อเดือน', student.father_monthly_income ? `${student.father_monthly_income.toLocaleString()} บาท` : '-')}

        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลมารดา</h3>
        {renderInfoRow('ชื่อ-นามสกุล', `${student.mother_title || ''} ${student.mother_first_name || ''} ${student.mother_last_name || ''}`.trim() || '-')}
        {renderInfoRow('อาชีพ', student.mother_occupation)}
        {renderInfoRow('เบอร์โทรศัพท์', student.mother_phone)}

        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลผู้ปกครอง</h3>
        {renderInfoRow('ชื่อ-นามสกุล', `${student.guardian_title || ''} ${student.guardian_first_name || ''} ${student.guardian_last_name || ''}`.trim() || '-')}
        {renderInfoRow('ความสัมพันธ์', student.guardian_relationship)}
        {renderInfoRow('อาชีพ', student.guardian_occupation)}
        {renderInfoRow('เบอร์โทรศัพท์', student.guardian_phone)}
        {renderInfoRow('รายได้ต่อเดือน', student.guardian_monthly_income ? `${student.guardian_monthly_income.toLocaleString()} บาท` : '-')}

        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">ข้อมูลพี่น้อง</h3>
        {renderInfoRow('เป็นบุตรคนที่', student.child_order || '-')}
        {renderInfoRow('พี่ชาย', student.older_brothers ?? '-')}
        {renderInfoRow('น้องชาย', student.younger_brothers ?? '-')}
        {renderInfoRow('พี่สาว', student.older_sisters ?? '-')}
        {renderInfoRow('น้องสาว', student.younger_sisters ?? '-')}
        {renderInfoRow('สถานภาพบิดามารดา', student.parents_marital_status)}
      </div>
    );
  };

  const renderPasswordTab = () => {
    if (userLoading) {
      return (
        <div className="flex flex-col items-center p-10 text-gray-500">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin mb-4"></div>
          <p>กำลังตรวจสอบบัญชีผู้ใช้...</p>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-5">
          {userAccount ? (
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-green-50 border border-green-300">
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold shrink-0">&#10003;</div>
              <div>
                <p className="m-0 mb-1 font-semibold text-[15px] text-gray-800">มีบัญชีผู้ใช้แล้ว</p>
                <p className="my-0.5 text-[13px] text-gray-600">Username: <strong>{userAccount.username}</strong></p>
                <p className="my-0.5 text-[13px] text-gray-600">Email: {userAccount.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-orange-50 border border-orange-300">
              <div className="w-10 h-10 rounded-full bg-orange-400 text-white flex items-center justify-center text-xl font-bold shrink-0">!</div>
              <div>
                <p className="m-0 mb-1 font-semibold text-[15px] text-gray-800">ยังไม่มีบัญชีผู้ใช้</p>
                <p className="my-0.5 text-[13px] text-gray-600">ระบบจะสร้างบัญชีใหม่โดยใช้รหัสนักเรียน <strong>{student.student_code}</strong> เป็น Username</p>
              </div>
            </div>
          )}
        </div>

        <h3 className="text-base text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">
          {userAccount ? 'เปลี่ยนรหัสผ่าน' : 'สร้างบัญชีและตั้งรหัสผ่าน'}
        </h3>

        <form onSubmit={handleSetPassword} className="max-w-[400px]">
          {!userAccount && (
            <div className="mb-4">
              <label className={labelCls}>Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="กรอก Username"
                required
                className={inputCls}
              />
            </div>
          )}
          <div className="mb-4">
            <label className={labelCls}>Gmail {userAccount ? '' : '(บังคับ)'}</label>
            <input
              type="email"
              value={gmailInput}
              onChange={(e) => setGmailInput(e.target.value)}
              placeholder={userAccount ? 'กรอก Gmail' : 'กรอก Gmail (บังคับ)'}
              className={inputCls}
            />
          </div>
          <div className="mb-4">
            <label className={labelCls}>รหัสผ่านใหม่</label>
            <input
              type="password"
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
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              required
              minLength={4}
              className={inputCls}
            />
          </div>

          {passwordMsg && (
            <div className={`px-3.5 py-2.5 rounded-lg text-sm mb-4 ${
              passwordMsg.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-300'
                : 'bg-red-50 text-red-800 border border-red-300'
            }`}>
              {passwordMsg.text}
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#5568d3] disabled:bg-gray-300 disabled:cursor-not-allowed text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
            disabled={passwordSaving}
          >
            {passwordSaving ? 'กำลังบันทึก...' : userAccount ? 'เปลี่ยนรหัสผ่าน' : 'สร้างบัญชีผู้ใช้'}
          </button>
        </form>
      </div>
    );
  };

  const saveBtnCls = 'px-6 py-2.5 bg-[#2563eb] hover:bg-[#5568d3] disabled:bg-gray-300 disabled:cursor-not-allowed text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ข้อมูลนักเรียน" size="medium">
      {loading && (
        <div className="flex flex-col items-center p-10 text-gray-500">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin mb-4"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-10 text-red-500">
          <p>{error}</p>
          <button onClick={fetchStudent} className="mt-3 px-5 py-2 bg-[#2563eb] hover:bg-[#5568d3] text-white border-none rounded-lg cursor-pointer text-sm">ลองอีกครั้ง</button>
        </div>
      )}

      {student && !loading && (
        <>
          <div className="flex items-center gap-4 pb-5 mb-5 border-b-2 border-gray-200 max-sm:flex-col max-sm:text-center">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden">
              {(pickedBlobUrl || profileBlobUrl) ? (
                <img
                  src={pickedBlobUrl || profileBlobUrl}
                  alt="profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>{student.first_name_th?.charAt(0) || '?'}</span>
              )}
              {isEditing && (
                <label
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: 4,
                  }}
                >
                  เปลี่ยนรูป
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePickProfile}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
            <div>
              <h3 className="m-0 mb-1 text-xl text-gray-800">{student.title_th} {student.first_name_th} {student.last_name_th}</h3>
              <p className="m-0 text-gray-500 text-sm">รหัส: {student.student_code}</p>
              <p className="mt-0.5 m-0 text-[#2563eb] text-sm font-medium">ชั้น {student.grade}/{student.section}</p>
            </div>
            {/* ปุ่ม edit/save/cancel — ไม่แสดงในแท็บ password */}
            {activeTab !== 'password' && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {!isEditing ? (
                  <button onClick={handleStartEdit} className={saveBtnCls} style={{ background: '#1976d2' }}>
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
              { key: 'address', label: 'ที่อยู่' },
              { key: 'family', label: 'ครอบครัว' },
              { key: 'password', label: 'ตั้งรหัสผ่าน' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`px-5 py-2 border-none rounded-[20px] text-sm cursor-pointer transition-all font-medium ${
                  activeTab === tab.key
                    ? 'bg-[#2563eb] text-white'
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
            {activeTab === 'address' && renderAddressTab()}
            {activeTab === 'family' && renderFamilyTab()}
            {activeTab === 'password' && renderPasswordTab()}
          </div>
        </>
      )}
    </Modal>
  );
};

export default StudentDetailModal;
