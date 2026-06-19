'use client';

import BehaviorManagement from '../components/BehaviorManagement';
import Sidebar from '../components/Sidebar';

const BehaviorScorePage = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-[280px] min-h-screen bg-slate-50 p-8">
        <BehaviorManagement />
      </div>
    </div>
  );
};

export default BehaviorScorePage;
