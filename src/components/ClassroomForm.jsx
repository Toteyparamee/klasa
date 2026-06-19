'use client';

import { useState, useEffect } from 'react';

const ClassroomForm = ({ onSubmit, onCancel, teachers, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    homeroomTeacherId: null
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        homeroomTeacherId: initialData.homeroomTeacherId || null
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'homeroomTeacherId' ? (value === '' ? null : parseInt(value)) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    if (!initialData) {
      setFormData({
        name: '',
        homeroomTeacherId: null
      });
    }
  };

  const inputCls = 'p-3 border-2 border-[#ddd] rounded-md text-[15px] transition-all outline-none font-[inherit] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]';

  return (
    <form
      className="bg-white p-[25px] rounded-[10px] border-2 border-[#2563eb] shadow-[0_4px_12px_rgba(102,126,234,0.15)] mb-5"
      onSubmit={handleSubmit}
    >
      <h3 className="m-0 mb-5 text-[#333] text-[20px] font-semibold pb-[15px] border-b-2 border-[#eee]">
        {initialData ? 'แก้ไขห้องเรียน' : 'เพิ่มห้องเรียน'}
      </h3>

      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="flex flex-col">
          <label className="mb-2 font-medium text-[#555] text-sm">ชื่อห้องเรียน *</label>
          <input
            className={inputCls}
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="เช่น ม.1/1"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-2 font-medium text-[#555] text-sm">ครูประจำชั้น</label>
          <select
            name="homeroomTeacherId"
            value={formData.homeroomTeacherId || ''}
            onChange={handleChange}
            className={`${inputCls} cursor-pointer bg-white`}
          >
            <option value="">-- เลือกครูประจำชั้น --</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.firstNameTh} {teacher.lastNameTh} ({teacher.subject || ''})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2.5 justify-end pt-[15px] border-t-2 border-[#eee] max-md:flex-col-reverse">
        <button
          type="submit"
          className="px-6 py-3 bg-[#2563eb] text-white border-none rounded-md cursor-pointer font-medium text-[15px] transition-colors hover:bg-[#5568d3] max-md:w-full"
        >
          {initialData ? 'บันทึกการแก้ไข' : 'เพิ่มห้องเรียน'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-[#f5f5f5] text-[#666] border-2 border-[#ddd] rounded-md cursor-pointer font-medium text-[15px] transition-all hover:bg-[#eee] hover:border-[#ccc] max-md:w-full"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
};

export default ClassroomForm;
