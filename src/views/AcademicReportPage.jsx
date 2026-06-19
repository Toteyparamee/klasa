'use client';

import AcademicReport from '../components/AcademicReport';
import Sidebar from '../components/Sidebar';

const AcademicReportPage = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-[280px] min-h-screen bg-slate-50">
        <div className="p-8">
          <AcademicReport />
        </div>
      </div>
    </div>
  );
};

export default AcademicReportPage;
