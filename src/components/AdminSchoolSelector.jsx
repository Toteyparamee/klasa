'use client';

import { useSchool } from '../context/SchoolContext';

const AdminSchoolSelector = () => {
  const { schools, selectedSchoolId, setSelectedSchoolId } = useSchool();

  return (
    <div className="px-3 pb-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2">
          เลือกโรงเรียน
        </div>
        <select
          value={selectedSchoolId ?? ''}
          onChange={(e) => setSelectedSchoolId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-2.5 py-2 text-sm border border-amber-200 rounded-lg bg-white text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 cursor-pointer"
        >
          <option value="">— ทุกโรงเรียน —</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
        {selectedSchoolId && (
          <div className="mt-1.5 text-[11px] text-amber-600 text-center">
            กำลังดูข้อมูลโรงเรียนที่เลือก
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSchoolSelector;
