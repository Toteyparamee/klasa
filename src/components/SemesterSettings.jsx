'use client';

import { useState, useEffect } from 'react';
import { settingsAPI, getToken, API_CONFIG } from '../api';
import { useSchoolId } from '../hooks/useSchoolId';

const SemesterSettings = () => {
  const schoolId = useSchoolId();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    academic_year: '',
    semester: 1,
    start_date: '',
    end_date: '',
    is_current: false,
  });

  // โหลดข้อมูลการตั้งค่าเทอม
  const fetchSettings = async () => {
    if (!schoolId) {
      setSettings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setError('กรุณาเข้าสู่ระบบก่อน');
        setLoading(false);
        return;
      }

      const data = await settingsAPI.getSemesterSettings(schoolId);
      if (data.success) {
        setSettings(data.data || []);
      } else {
        setError(data.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (err) {
      console.error('Error fetching semester settings:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [schoolId]);

  // จัดการ form input
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // เปิด form สร้างใหม่
  const handleAddNew = () => {
    const currentYear = new Date().getFullYear() + 543;
    setFormData({
      academic_year: currentYear.toString(),
      semester: 1,
      start_date: '',
      end_date: '',
      is_current: false,
    });
    setEditingId(null);
    setShowForm(true);
  };

  // เปิด form แก้ไข
  const handleEdit = (setting) => {
    setFormData({
      academic_year: setting.academic_year,
      semester: setting.semester,
      start_date: setting.start_date.split('T')[0],
      end_date: setting.end_date.split('T')[0],
      is_current: setting.is_current,
    });
    setEditingId(setting.id);
    setShowForm(true);
  };

  // บันทึกข้อมูล
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        setError('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      const payload = {
        school_id: schoolId,
        academic_year: formData.academic_year,
        semester: parseInt(formData.semester),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_current: formData.is_current,
      };

      let result;
      if (editingId) {
        result = await settingsAPI.updateSemesterSetting(editingId, payload);
      } else {
        result = await settingsAPI.createSemesterSetting(payload);
      }

      if (result.success) {
        setShowForm(false);
        setEditingId(null);
        fetchSettings();
      } else {
        setError(result.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      console.error('Error saving semester setting:', err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // ลบการตั้งค่า
  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบการตั้งค่าเทอมนี้หรือไม่?')) {
      return;
    }

    try {
      const result = await settingsAPI.deleteSemesterSetting(id);
      if (result.success) {
        fetchSettings();
      } else {
        setError(result.message || 'ไม่สามารถลบข้อมูลได้');
      }
    } catch (err) {
      console.error('Error deleting semester setting:', err);
      setError('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  // ตั้งเป็นเทอมปัจจุบัน
  const handleSetCurrent = async (id) => {
    try {
      const result = await settingsAPI.setCurrentSemester(id);
      if (result.success) {
        fetchSettings();
      } else {
        setError(result.message || 'ไม่สามารถตั้งค่าได้');
      }
    } catch (err) {
      console.error('Error setting current semester:', err);
      setError('เกิดข้อผิดพลาด');
    }
  };

  // แปลงวันที่เป็นรูปแบบไทย
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const inputCls = 'w-full py-2.5 px-3 border border-gray-300 rounded-md text-base transition-colors focus:outline-none focus:border-blue-400';

  if (loading) {
    return (
      <div className="p-5">
        <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="m-0 text-gray-700 text-2xl">ตั้งค่าภาคเรียน</h2>
        <button
          className="bg-green-500 text-white border-none py-2.5 px-5 rounded-md cursor-pointer text-[0.95rem] hover:bg-green-600 transition-colors"
          onClick={handleAddNew}
        >
          + เพิ่มการตั้งค่าเทอม
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 py-3 px-4 rounded-md mb-5 flex justify-between items-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="bg-transparent border-none text-red-700 cursor-pointer text-xl"
          >
            x
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl mx-5">
            <div className="flex justify-between items-center py-4 px-5 border-b border-gray-200">
              <h3 className="m-0 text-gray-700">{editingId ? 'แก้ไขการตั้งค่าเทอม' : 'เพิ่มการตั้งค่าเทอม'}</h3>
              <button
                className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 hover:text-gray-800"
                onClick={() => setShowForm(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5">
              <div className="mb-4">
                <label className="block mb-1.5 text-gray-600 font-medium">ปีการศึกษา (พ.ศ.)</label>
                <input
                  type="text"
                  name="academic_year"
                  value={formData.academic_year}
                  onChange={handleInputChange}
                  placeholder="เช่น 2568"
                  required
                  className={inputCls}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1.5 text-gray-600 font-medium">ภาคเรียน</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleInputChange}
                  required
                  className={inputCls}
                >
                  <option value={1}>ภาคเรียนที่ 1</option>
                  <option value={2}>ภาคเรียนที่ 2</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block mb-1.5 text-gray-600 font-medium">วันเริ่มต้นเทอม</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className={inputCls}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1.5 text-gray-600 font-medium">วันสิ้นสุดเทอม</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className={inputCls}
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_current"
                    checked={formData.is_current}
                    onChange={handleInputChange}
                    className="w-[18px] h-[18px]"
                  />
                  ตั้งเป็นเทอมปัจจุบัน
                </label>
              </div>

              <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="bg-gray-100 text-gray-500 border border-gray-300 py-2.5 px-6 rounded-md cursor-pointer text-[0.95rem] hover:bg-gray-200 transition-colors"
                  onClick={() => setShowForm(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white border-none py-2.5 px-6 rounded-md cursor-pointer text-[0.95rem] hover:bg-blue-700 transition-colors"
                >
                  {editingId ? 'บันทึก' : 'เพิ่ม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-5">
        {settings.length === 0 ? (
          <div className="text-center py-10 px-5 text-gray-500">
            <p className="text-[1.1rem] mb-2">ยังไม่มีการตั้งค่าภาคเรียน</p>
            <p className="text-[0.9rem] text-gray-400">กรุณาเพิ่มการตั้งค่าเทอมเพื่อกำหนดช่วงเวลาของแต่ละภาคเรียน</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="py-3.5 px-4 text-left border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold text-[0.9rem]">ปีการศึกษา</th>
                <th className="py-3.5 px-4 text-left border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold text-[0.9rem]">ภาคเรียน</th>
                <th className="py-3.5 px-4 text-left border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold text-[0.9rem]">วันเริ่มต้น</th>
                <th className="py-3.5 px-4 text-left border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold text-[0.9rem]">วันสิ้นสุด</th>
                <th className="py-3.5 px-4 text-left border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold text-[0.9rem]">สถานะ</th>
                <th className="py-3.5 px-4 text-left border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold text-[0.9rem]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr
                  key={setting.id}
                  className={`border-b border-gray-100 transition-colors ${setting.is_current ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <td className="py-3.5 px-4">{setting.academic_year}</td>
                  <td className="py-3.5 px-4">ภาคเรียนที่ {setting.semester}</td>
                  <td className="py-3.5 px-4">{formatDate(setting.start_date)}</td>
                  <td className="py-3.5 px-4">{formatDate(setting.end_date)}</td>
                  <td className="py-3.5 px-4">
                    {setting.is_current ? (
                      <span className="inline-block py-1 px-2.5 rounded-xl text-[0.8rem] font-medium bg-green-500 text-white">เทอมปัจจุบัน</span>
                    ) : (
                      <span className="inline-block py-1 px-2.5 rounded-xl text-[0.8rem] font-medium bg-gray-200 text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-2 flex-wrap">
                      {!setting.is_current && (
                        <button
                          className="bg-orange-400 text-white border-none py-1.5 px-3 rounded cursor-pointer text-[0.85rem] hover:bg-orange-500 transition-colors"
                          onClick={() => handleSetCurrent(setting.id)}
                          title="ตั้งเป็นเทอมปัจจุบัน"
                        >
                          ตั้งเป็นปัจจุบัน
                        </button>
                      )}
                      <button
                        className="bg-blue-500 text-white border-none py-1.5 px-3 rounded cursor-pointer text-[0.85rem] hover:bg-blue-700 transition-colors"
                        onClick={() => handleEdit(setting)}
                        title="แก้ไข"
                      >
                        แก้ไข
                      </button>
                      <button
                        className="bg-red-500 text-white border-none py-1.5 px-3 rounded cursor-pointer text-[0.85rem] hover:bg-red-700 transition-colors"
                        onClick={() => handleDelete(setting.id)}
                        title="ลบ"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg py-4 px-5 border-l-4 border-blue-500">
        <h4 className="mt-0 mb-3 text-blue-800">คำอธิบาย</h4>
        <ul className="m-0 pl-5">
          <li className="mb-1.5 text-gray-700 text-[0.9rem]"><strong className="text-blue-800">ปีการศึกษา:</strong> ระบุเป็นปี พ.ศ. เช่น 2568</li>
          <li className="mb-1.5 text-gray-700 text-[0.9rem]"><strong className="text-blue-800">ภาคเรียน:</strong> เลือกภาคเรียนที่ 1 หรือ 2</li>
          <li className="mb-1.5 text-gray-700 text-[0.9rem]"><strong className="text-blue-800">วันเริ่มต้น/สิ้นสุด:</strong> กำหนดช่วงเวลาของภาคเรียน</li>
          <li className="mb-1.5 text-gray-700 text-[0.9rem]"><strong className="text-blue-800">เทอมปัจจุบัน:</strong> ระบบจะใช้เทอมที่ตั้งเป็นปัจจุบันในการแสดงข้อมูลตารางเรียน/สอน</li>
        </ul>
      </div>
    </div>
  );
};

export default SemesterSettings;
