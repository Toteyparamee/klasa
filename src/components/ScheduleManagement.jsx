'use client';

import { useState } from 'react';
import SubjectManagement from './SubjectManagement';
import TeacherSchedule from './TeacherSchedule';
import PeriodGridSettings from './PeriodGridSettings';

const ScheduleManagement = ({ school }) => {
  const [activeSubTab, setActiveSubTab] = useState('schedule');
  const [subjects, setSubjects] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [periodConfigVersion, setPeriodConfigVersion] = useState(0);

  const handleSubjectsUpdate = (updatedSubjects) => {
    setSubjects(updatedSubjects);
  };

  const handlePeriodSave = () => {
    setPeriodConfigVersion(v => v + 1);
  };

  const tabBase = 'px-6 py-3 bg-transparent border-none border-b-[3px] border-transparent cursor-pointer text-[15px] font-semibold text-gray-500 transition-all rounded-t-lg flex items-center gap-2 hover:text-indigo-500 hover:bg-gray-50';
  const tabActive = 'text-indigo-500 border-b-indigo-500 bg-gray-100';

  return (
    <div className="bg-gray-100 min-h-full flex flex-col">
      <div className="flex gap-1 bg-white px-5 pt-4 pb-0 border-b-2 border-gray-200">
        <button
          className={`${tabBase} ${activeSubTab === 'schedule' ? tabActive : ''}`}
          onClick={() => setActiveSubTab('schedule')}
        >
          📅 ตารางสอน
        </button>
        <button
          className={`${tabBase} ${activeSubTab === 'subjects' ? tabActive : ''}`}
          onClick={() => setActiveSubTab('subjects')}
        >
          📚 รายวิชา
        </button>
        <button
          className={`${tabBase} ${activeSubTab === 'grid-settings' ? tabActive : ''}`}
          onClick={() => setActiveSubTab('grid-settings')}
        >
          ⚙️ ตั้งค่าตาราง
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div style={{ display: activeSubTab === 'schedule' ? 'block' : 'none' }}>
          <TeacherSchedule
            teachers={school?.teachers || []}
            selectedTeacher={selectedTeacher}
            onTeacherChange={setSelectedTeacher}
            periodConfigVersion={periodConfigVersion}
            school={school}
          />
        </div>
        <div style={{ display: activeSubTab === 'subjects' ? 'block' : 'none' }}>
          <SubjectManagement
            onSubjectsUpdate={handleSubjectsUpdate}
            selectedTeacher={selectedTeacher}
            teachers={school?.teachers || []}
            onTeacherChange={setSelectedTeacher}
            classrooms={school?.classrooms || []}
          />
        </div>
        <div style={{ display: activeSubTab === 'grid-settings' ? 'block' : 'none' }}>
          <PeriodGridSettings onSave={handlePeriodSave} />
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagement;
