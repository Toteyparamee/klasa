'use client';

import { useState } from 'react';

const emptyForm = {
  // ข้อมูลพื้นฐาน
  studentId: '',
  studentNumber: '',
  nationalId: '',
  titleTh: '',
  firstNameTh: '',
  lastNameTh: '',
  firstNameEn: '',
  lastNameEn: '',
  gender: '',
  birthDate: '',
  bloodType: '',
  nationality: '',
  ethnicity: '',
  religion: '',
  birthProvince: '',
  // ที่อยู่
  houseNumber: '',
  villageNo: '',
  road: '',
  subDistrict: '',
  district: '',
  province: '',
  postalCode: '',
  currentPhone: '',
  // ข้อมูลร่างกาย
  weight: '',
  height: '',
  // การเดินทาง
  distancePavedRoad: '',
  distanceUnpavedRoad: '',
  travelTime: '',
  travelMethod: '',
  // บิดา
  fatherTitle: '',
  fatherFirstName: '',
  fatherLastName: '',
  fatherOccupation: '',
  fatherMonthlyIncome: '',
  fatherPhone: '',
  // มารดา
  motherTitle: '',
  motherFirstName: '',
  motherLastName: '',
  motherOccupation: '',
  motherMonthlyIncome: '',
  motherPhone: '',
  // ผู้ปกครอง
  guardianRelationship: '',
  guardianTitle: '',
  guardianFirstName: '',
  guardianLastName: '',
  guardianOccupation: '',
  guardianMonthlyIncome: '',
  guardianPhone: '',
  // พี่น้อง
  childOrder: '',
  olderBrothers: '',
  youngerBrothers: '',
  olderSisters: '',
  youngerSisters: '',
  parentsMaritalStatus: '',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#2563eb] transition-colors';
const labelCls = 'block text-sm font-semibold text-gray-600 mb-1';

const StudentForm = ({ onSubmit, onCancel, multiMode = false }) => {
  const [formData, setFormData] = useState({ ...emptyForm });
  const [activeSection, setActiveSection] = useState('basic');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      // ข้อมูลพื้นฐาน (camelCase ตามที่ context ใช้)
      studentId: formData.studentId,
      studentNumber: formData.studentNumber ? parseInt(formData.studentNumber) : null,
      nationalId: formData.nationalId,
      titleTh: formData.titleTh,
      firstNameTh: formData.firstNameTh,
      lastNameTh: formData.lastNameTh,
      firstNameEn: formData.firstNameEn,
      lastNameEn: formData.lastNameEn,
      gender: formData.gender,
      birthDate: formData.birthDate || null,
      bloodType: formData.bloodType,
      nationality: formData.nationality,
      ethnicity: formData.ethnicity,
      religion: formData.religion,
      birthProvince: formData.birthProvince,
      // ที่อยู่
      houseNumber: formData.houseNumber,
      villageNo: formData.villageNo,
      road: formData.road,
      subDistrict: formData.subDistrict,
      district: formData.district,
      province: formData.province,
      postalCode: formData.postalCode,
      currentPhone: formData.currentPhone,
      phone: formData.currentPhone,
      // ข้อมูลร่างกาย
      weight: formData.weight ? parseFloat(formData.weight) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      // การเดินทาง
      distancePavedRoad: formData.distancePavedRoad ? parseFloat(formData.distancePavedRoad) : null,
      distanceUnpavedRoad: formData.distanceUnpavedRoad ? parseFloat(formData.distanceUnpavedRoad) : null,
      travelTime: formData.travelTime ? parseInt(formData.travelTime) : null,
      travelMethod: formData.travelMethod,
      // บิดา
      fatherTitle: formData.fatherTitle,
      fatherFirstName: formData.fatherFirstName,
      fatherLastName: formData.fatherLastName,
      fatherName: formData.fatherFirstName,
      fatherOccupation: formData.fatherOccupation,
      fatherMonthlyIncome: formData.fatherMonthlyIncome ? parseFloat(formData.fatherMonthlyIncome) : null,
      fatherPhone: formData.fatherPhone,
      // มารดา
      motherTitle: formData.motherTitle,
      motherFirstName: formData.motherFirstName,
      motherLastName: formData.motherLastName,
      motherName: formData.motherFirstName,
      motherOccupation: formData.motherOccupation,
      motherMonthlyIncome: formData.motherMonthlyIncome ? parseFloat(formData.motherMonthlyIncome) : null,
      motherPhone: formData.motherPhone,
      // ผู้ปกครอง
      guardianRelationship: formData.guardianRelationship,
      guardianTitle: formData.guardianTitle,
      guardianFirstName: formData.guardianFirstName,
      guardianLastName: formData.guardianLastName,
      guardianOccupation: formData.guardianOccupation,
      guardianMonthlyIncome: formData.guardianMonthlyIncome ? parseFloat(formData.guardianMonthlyIncome) : null,
      guardianPhone: formData.guardianPhone,
      // พี่น้อง
      childOrder: formData.childOrder ? parseInt(formData.childOrder) : null,
      olderBrothers: formData.olderBrothers ? parseInt(formData.olderBrothers) : 0,
      youngerBrothers: formData.youngerBrothers ? parseInt(formData.youngerBrothers) : 0,
      olderSisters: formData.olderSisters ? parseInt(formData.olderSisters) : 0,
      youngerSisters: formData.youngerSisters ? parseInt(formData.youngerSisters) : 0,
      parentsMaritalStatus: formData.parentsMaritalStatus,
    });
    setFormData({ ...emptyForm });
  };

  const sections = [
    { key: 'basic', label: 'ข้อมูลพื้นฐาน' },
    { key: 'address', label: 'ที่อยู่' },
    { key: 'family', label: 'ครอบครัว' },
    { key: 'other', label: 'อื่นๆ' },
  ];

  return (
    <form className="bg-white p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] mb-5" onSubmit={handleSubmit}>
      <h3 className="mt-0 mb-5 text-gray-800 text-xl border-b-2 border-[#2563eb] pb-2">เพิ่มนักเรียน</h3>

      <div className="flex gap-1 mb-5 border-b-2 border-gray-200">
        {sections.map(s => (
          <button
            key={s.key}
            type="button"
            className={`px-[18px] py-2 border-none bg-transparent text-sm font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors duration-200 ${
              activeSection === s.key
                ? 'text-[#2563eb] border-b-[#2563eb] border-b-2'
                : 'text-gray-500 border-b-transparent hover:text-[#2563eb]'
            }`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== ข้อมูลพื้นฐาน ===== */}
      {activeSection === 'basic' && (
        <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
          <div className="flex flex-col">
            <label className={labelCls}>รหัสนักเรียน *</label>
            <input type="text" name="studentId" value={formData.studentId} onChange={handleChange} required className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เลขที่ *</label>
            <input type="number" name="studentNumber" value={formData.studentNumber} onChange={handleChange} required min="1" className={inputCls} />
          </div>
          <div className="flex flex-col col-span-2 max-sm:col-span-1">
            <label className={labelCls}>เลขบัตรประชาชน</label>
            <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} placeholder="กรอก 13 หลัก" maxLength={13} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>คำนำหน้า</label>
            <select name="titleTh" value={formData.titleTh} onChange={handleChange} className={inputCls}>
              <option value="">-- เลือก --</option>
              <option>เด็กชาย</option>
              <option>เด็กหญิง</option>
              <option>นาย</option>
              <option>นางสาว</option>
              <option>นาง</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เพศ</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls}>
              <option value="">-- เลือก --</option>
              <option value="ชาย">ชาย</option>
              <option value="หญิง">หญิง</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ชื่อ (ไทย) *</label>
            <input type="text" name="firstNameTh" value={formData.firstNameTh} onChange={handleChange} required className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>นามสกุล (ไทย) *</label>
            <input type="text" name="lastNameTh" value={formData.lastNameTh} onChange={handleChange} required className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ชื่อ (อังกฤษ)</label>
            <input type="text" name="firstNameEn" value={formData.firstNameEn} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>นามสกุล (อังกฤษ)</label>
            <input type="text" name="lastNameEn" value={formData.lastNameEn} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>วันเกิด</label>
            <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>กรุ๊ปเลือด</label>
            <select name="bloodType" value={formData.bloodType} onChange={handleChange} className={inputCls}>
              <option value="">-- เลือก --</option>
              <option>A</option><option>B</option><option>AB</option><option>O</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>สัญชาติ</label>
            <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} placeholder="ไทย" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เชื้อชาติ</label>
            <input type="text" name="ethnicity" value={formData.ethnicity} onChange={handleChange} placeholder="ไทย" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ศาสนา</label>
            <input type="text" name="religion" value={formData.religion} onChange={handleChange} placeholder="พุทธ" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>จังหวัดที่เกิด</label>
            <input type="text" name="birthProvince" value={formData.birthProvince} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>น้ำหนัก (กก.)</label>
            <input type="number" step="0.01" name="weight" value={formData.weight} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ส่วนสูง (ซม.)</label>
            <input type="number" step="0.01" name="height" value={formData.height} onChange={handleChange} className={inputCls} />
          </div>
        </div>
      )}

      {/* ===== ที่อยู่ ===== */}
      {activeSection === 'address' && (
        <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
          <div className="flex flex-col">
            <label className={labelCls}>บ้านเลขที่</label>
            <input type="text" name="houseNumber" value={formData.houseNumber} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>หมู่</label>
            <input type="text" name="villageNo" value={formData.villageNo} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ถนน</label>
            <input type="text" name="road" value={formData.road} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ตำบล</label>
            <input type="text" name="subDistrict" value={formData.subDistrict} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>อำเภอ</label>
            <input type="text" name="district" value={formData.district} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>จังหวัด</label>
            <input type="text" name="province" value={formData.province} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>รหัสไปรษณีย์</label>
            <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} maxLength={5} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เบอร์โทรศัพท์</label>
            <input type="tel" name="currentPhone" value={formData.currentPhone} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ระยะทาง (ถนนลาดยาง) กม.</label>
            <input type="number" step="0.01" name="distancePavedRoad" value={formData.distancePavedRoad} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ระยะทาง (ถนนลูกรัง) กม.</label>
            <input type="number" step="0.01" name="distanceUnpavedRoad" value={formData.distanceUnpavedRoad} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เวลาเดินทาง (นาที)</label>
            <input type="number" name="travelTime" value={formData.travelTime} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>วิธีการเดินทาง</label>
            <input type="text" name="travelMethod" value={formData.travelMethod} onChange={handleChange} placeholder="เช่น รถยนต์, เดินเท้า" className={inputCls} />
          </div>
        </div>
      )}

      {/* ===== ครอบครัว ===== */}
      {activeSection === 'family' && (
        <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
          <div className="flex flex-col col-span-2 max-sm:col-span-1 pt-2 text-gray-700 text-sm"><strong>ข้อมูลบิดา</strong></div>
          <div className="flex flex-col">
            <label className={labelCls}>คำนำหน้า</label>
            <input type="text" name="fatherTitle" value={formData.fatherTitle} onChange={handleChange} placeholder="นาย" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ชื่อบิดา</label>
            <input type="text" name="fatherFirstName" value={formData.fatherFirstName} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>นามสกุลบิดา</label>
            <input type="text" name="fatherLastName" value={formData.fatherLastName} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>อาชีพบิดา</label>
            <input type="text" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เบอร์โทรบิดา</label>
            <input type="tel" name="fatherPhone" value={formData.fatherPhone} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>รายได้บิดา (บาท/เดือน)</label>
            <input type="number" step="0.01" name="fatherMonthlyIncome" value={formData.fatherMonthlyIncome} onChange={handleChange} className={inputCls} />
          </div>

          <div className="flex flex-col col-span-2 max-sm:col-span-1 pt-2 text-gray-700 text-sm"><strong>ข้อมูลมารดา</strong></div>
          <div className="flex flex-col">
            <label className={labelCls}>คำนำหน้า</label>
            <input type="text" name="motherTitle" value={formData.motherTitle} onChange={handleChange} placeholder="นาง / นางสาว" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ชื่อมารดา</label>
            <input type="text" name="motherFirstName" value={formData.motherFirstName} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>นามสกุลมารดา</label>
            <input type="text" name="motherLastName" value={formData.motherLastName} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>อาชีพมารดา</label>
            <input type="text" name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เบอร์โทรมารดา</label>
            <input type="tel" name="motherPhone" value={formData.motherPhone} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>รายได้มารดา (บาท/เดือน)</label>
            <input type="number" step="0.01" name="motherMonthlyIncome" value={formData.motherMonthlyIncome} onChange={handleChange} className={inputCls} />
          </div>

          <div className="flex flex-col col-span-2 max-sm:col-span-1 pt-2 text-gray-700 text-sm"><strong>ข้อมูลผู้ปกครอง</strong></div>
          <div className="flex flex-col">
            <label className={labelCls}>ความสัมพันธ์</label>
            <input type="text" name="guardianRelationship" value={formData.guardianRelationship} onChange={handleChange} placeholder="เช่น บิดา, มารดา, ปู่" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>คำนำหน้า</label>
            <input type="text" name="guardianTitle" value={formData.guardianTitle} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>ชื่อผู้ปกครอง</label>
            <input type="text" name="guardianFirstName" value={formData.guardianFirstName} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>นามสกุลผู้ปกครอง</label>
            <input type="text" name="guardianLastName" value={formData.guardianLastName} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>อาชีพผู้ปกครอง</label>
            <input type="text" name="guardianOccupation" value={formData.guardianOccupation} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>เบอร์โทรผู้ปกครอง</label>
            <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>รายได้ผู้ปกครอง (บาท/เดือน)</label>
            <input type="number" step="0.01" name="guardianMonthlyIncome" value={formData.guardianMonthlyIncome} onChange={handleChange} className={inputCls} />
          </div>
        </div>
      )}

      {/* ===== อื่นๆ ===== */}
      {activeSection === 'other' && (
        <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
          <div className="flex flex-col col-span-2 max-sm:col-span-1 pt-2 text-gray-700 text-sm"><strong>ข้อมูลพี่น้อง</strong></div>
          <div className="flex flex-col">
            <label className={labelCls}>เป็นบุตรคนที่</label>
            <input type="number" name="childOrder" value={formData.childOrder} onChange={handleChange} min="1" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>พี่ชาย</label>
            <input type="number" name="olderBrothers" value={formData.olderBrothers} onChange={handleChange} min="0" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>น้องชาย</label>
            <input type="number" name="youngerBrothers" value={formData.youngerBrothers} onChange={handleChange} min="0" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>พี่สาว</label>
            <input type="number" name="olderSisters" value={formData.olderSisters} onChange={handleChange} min="0" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>น้องสาว</label>
            <input type="number" name="youngerSisters" value={formData.youngerSisters} onChange={handleChange} min="0" className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className={labelCls}>สถานภาพบิดามารดา</label>
            <select name="parentsMaritalStatus" value={formData.parentsMaritalStatus} onChange={handleChange} className={inputCls}>
              <option value="">-- เลือก --</option>
              <option value="อยู่ด้วยกัน">อยู่ด้วยกัน</option>
              <option value="หย่าร้าง">หย่าร้าง</option>
              <option value="แยกกันอยู่">แยกกันอยู่</option>
              <option value="บิดาเสียชีวิต">บิดาเสียชีวิต</option>
              <option value="มารดาเสียชีวิต">มารดาเสียชีวิต</option>
              <option value="บิดามารดาเสียชีวิต">บิดามารดาเสียชีวิต</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-2.5 justify-end">
        <button type="submit" className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white border-none rounded-lg cursor-pointer font-medium transition-colors duration-300">
          {multiMode ? 'บันทึก & เพิ่มต่อ' : 'บันทึก'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 bg-gray-400 hover:bg-gray-500 text-white border-none rounded-lg cursor-pointer font-medium transition-colors duration-300">
          {multiMode ? 'ปิด' : 'ยกเลิก'}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;
