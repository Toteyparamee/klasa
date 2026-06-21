'use client';

// EmergencyDashboard — หน้าหลักสำหรับ admin/รปภ. เห็น live map ระหว่างเหตุฉุกเฉิน
//
// State machine:
//   - NO_ACTIVE  → แสดง history + sidebar
//   - ACTIVE     → live map + sidebar นับจำนวน + ปุ่ม "ปลดเหตุ"
//
// Polling: เช็ค active alert ทุก 30s
// WebSocket: connect ตอน active ขึ้น, disconnect ตอน resolved

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { emergencyAPI } from '../api';
import { useSchool } from '../context/SchoolContext';
import Sidebar from '../components/Sidebar';
import EmergencyWS from '../services/emergencyWS';

const SchoolLocationEditor = dynamic(() => import('../components/SchoolLocationEditor'), { ssr: false });

const EmergencyMap = dynamic(() => import('../components/EmergencyMap'), { ssr: false });

export default function EmergencyDashboard() {
  const { schools, updateSchool } = useSchool();
  const [active, setActive] = useState(null);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [editingBoundarySchool, setEditingBoundarySchool] = useState(null);

  // หา school ที่ตรงกับ active alert เพื่อเอา boundary + center
  const activeSchool = useMemo(
    () => (active ? schools.find((s) => s.id === active.school_id) ?? null : null),
    [active, schools]
  );

  const schoolCenter = useMemo(() => {
    if (!activeSchool) return null;
    if (activeSchool.latitude != null && activeSchool.longitude != null)
      return [activeSchool.latitude, activeSchool.longitude];
    return null;
  }, [activeSchool]);

  const schoolBoundary = useMemo(() => {
    if (!activeSchool?.boundary) return null;
    try {
      const raw = typeof activeSchool.boundary === 'string'
        ? JSON.parse(activeSchool.boundary)
        : activeSchool.boundary;
      return Array.isArray(raw) && raw.length >= 3 ? raw : null;
    } catch {
      return null;
    }
  }, [activeSchool]);

  // initial load + polling
  useEffect(() => {
    let timer;
    const tick = async () => {
      try {
        const res = await emergencyAPI.getActive();
        setActive(res.data ?? null);
      } catch (e) {
        console.error('getActive', e);
      } finally {
        setLoading(false);
      }
    };
    tick();
    timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  // history
  useEffect(() => {
    emergencyAPI.history().then((r) => setHistory(r.data ?? [])).catch(() => {});
  }, [active]);

  // WS connect เมื่อมี active alert
  useEffect(() => {
    if (!active) return;
    const ws = new EmergencyWS(emergencyAPI.liveURL(active.id));
    ws.on('snapshot', (data) => setUsers(data.users || []))
      .on('userUpdate', (data) => {
        setUsers((prev) => upsertUser(prev, data));
      })
      .on('statusUpdate', (data) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === data.user_id ? { ...u, status: data.status } : u
          )
        );
      })
      .on('resolved', () => setActive(null));
    ws.connect();
    return () => ws.close();
  }, [active]);

  const counts = useMemo(() => {
    const c = { total: users.length, safe: 0, need_help: 0, no_response: 0, offline: 0 };
    users.forEach((u) => {
      if (!u.online) c.offline += 1;
      else if (u.status === 'SAFE') c.safe += 1;
      else if (u.status === 'NEED_HELP') c.need_help += 1;
      else c.no_response += 1;
    });
    return c;
  }, [users]);

  const handleSnapshot = async () => {
    if (!active) return;
    setSnapshotLoading(true);
    try {
      const res = await emergencyAPI.snapshot(active.id);
      const data = res.data?.users ?? [];
      if (data.length === 0) {
        alert('ยังไม่มีผู้ใช้ส่งตำแหน่งมา');
        return;
      }
      setUsers(data);
    } catch (e) {
      alert(`โหลดตำแหน่งไม่สำเร็จ: ${e.message}`);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleSaveBoundary = async (data) => {
    try {
      await updateSchool(editingBoundarySchool.id, data);
      setEditingBoundarySchool(null);
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message);
    }
  };

  const handleResolve = async (falseAlarm = false) => {
    if (!active) return;
    if (
      !confirm(falseAlarm ? 'ยืนยันยกเลิก (false alarm)?' : 'ยืนยันปลดเหตุการณ์?')
    )
      return;
    setResolving(true);
    try {
      await emergencyAPI.resolve(active.id, '', falseAlarm);
      setActive(null);
      setUsers([]);
    } catch (e) {
      alert(`ปลดเหตุไม่สำเร็จ: ${e.message}`);
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  // ── INACTIVE ──
  if (!active) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">🚨 ระบบแจ้งเหตุฉุกเฉิน</h1>
                  <p className="text-sm text-gray-500 mt-1">ติดตามสถานการณ์และประวัติเหตุฉุกเฉิน</p>
                </div>
                {schools.length > 0 && (
                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer"
                    onClick={() => setEditingBoundarySchool(schools[0])}
                  >
                    🗺️ กำหนดขอบโรงเรียน
                  </button>
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-6 text-green-800 font-semibold text-base">
              ✓ ไม่มีเหตุฉุกเฉินขณะนี้
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-700 m-0">ประวัติ (100 รายการล่าสุด)</h2>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-6 py-3 text-sm border-b border-gray-100 bg-slate-50 text-gray-500 font-semibold">เวลา</th>
                    <th className="text-left px-6 py-3 text-sm border-b border-gray-100 bg-slate-50 text-gray-500 font-semibold">ประเภท</th>
                    <th className="text-left px-6 py-3 text-sm border-b border-gray-100 bg-slate-50 text-gray-500 font-semibold">รายละเอียด</th>
                    <th className="text-left px-6 py-3 text-sm border-b border-gray-100 bg-slate-50 text-gray-500 font-semibold">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-10 px-6 text-sm border-b border-gray-100">— ยังไม่มีประวัติ —</td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="text-left px-6 py-3 text-sm border-b border-gray-100 text-gray-700">{new Date(h.created_at).toLocaleString('th-TH')}</td>
                        <td className="text-left px-6 py-3 text-sm border-b border-gray-100 text-gray-700">{labelType(h.alert_type)}</td>
                        <td className="text-left px-6 py-3 text-sm border-b border-gray-100 text-gray-700">{h.note || '-'}</td>
                        <td className="text-left px-6 py-3 text-sm border-b border-gray-100 text-gray-700">{labelStatus(h.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {editingBoundarySchool && (
          <SchoolLocationEditor
            school={editingBoundarySchool}
            onSave={handleSaveBoundary}
            onClose={() => setEditingBoundarySchool(null)}
          />
        )}
      </div>
    );
  }

  // ── ACTIVE ──
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
        <div className="flex h-screen">
          <div className="flex-1 relative">
            <div
              className={`absolute top-4 left-4 right-4 z-[1000] px-5 py-3.5 rounded-2xl font-semibold text-base shadow-lg animate-pulse ${
                active.alert_type === 'earthquake'
                  ? 'bg-amber-900 text-white shadow-amber-900/30'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {labelType(active.alert_type)}
              {active.triggered_role === 'system' ? ' (อัตโนมัติ)' : ''}
              {' — '}{active.note || '(ไม่มีรายละเอียด)'}
            </div>
            <EmergencyMap
              users={users}
              schoolCenter={schoolCenter}
              schoolBoundary={schoolBoundary}
            />
          </div>

          <aside className="w-[320px] bg-white border-l border-gray-100 p-5 flex flex-col overflow-y-auto shadow-sm">
            <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">สรุปสถานะ</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Stat label="ทั้งหมด" value={counts.total} />
              <Stat label="ปลอดภัย" value={counts.safe} color="green" />
              <Stat label="ขอความช่วยเหลือ" value={counts.need_help} color="red" />
              <Stat label="ยังไม่ตอบ" value={counts.no_response} color="amber" />
            </div>
            <div className="text-xs text-gray-400 mb-1.5">
              ออฟไลน์ (&gt;60s ไม่ส่ง GPS): {counts.offline}
            </div>
            <div className="text-xs text-gray-400 mb-4">
              เริ่มเหตุการณ์: {new Date(active.created_at).toLocaleTimeString('th-TH')}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <button
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSnapshot}
                disabled={snapshotLoading}
              >
                📍 {snapshotLoading ? 'กำลังโหลด...' : 'ดูตำแหน่งทุกคน'}
              </button>
              {activeSchool && (
                <button
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer"
                  onClick={() => setEditingBoundarySchool(activeSchool)}
                >
                  🗺️ กำหนดขอบโรงเรียน
                </button>
              )}
              <button
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleResolve(false)}
                disabled={resolving}
              >
                {active.alert_type === 'earthquake'
                  ? '✓ ปิดการติดตาม'
                  : '✓ ปลดเหตุ — กลับสู่ปกติ'}
              </button>
              {active.alert_type !== 'earthquake' && (
                <button
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleResolve(true)}
                  disabled={resolving}
                >
                  ยกเลิก (false alarm)
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      {editingBoundarySchool && (
        <SchoolLocationEditor
          school={editingBoundarySchool}
          onSave={handleSaveBoundary}
          onClose={() => setEditingBoundarySchool(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  const colorClass = {
    green: 'text-green-700',
    red: 'text-red-600',
    amber: 'text-amber-600',
  }[color] || 'text-gray-900';

  return (
    <div className="bg-slate-50 border border-gray-100 rounded-xl p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}

function upsertUser(prev, update) {
  const idx = prev.findIndex((u) => u.user_id === update.user_id);
  if (idx === -1) {
    return [...prev, { ...update, online: true }];
  }
  const next = [...prev];
  next[idx] = { ...next[idx], ...update, online: true };
  return next;
}

function labelType(t) {
  return (
    {
      fire: '🔥 ไฟไหม้',
      earthquake: '🌍 แผ่นดินไหว',
      terrorist: '⚠️ ผู้บุกรุก',
    }[t] || t
  );
}

function labelStatus(s) {
  return (
    {
      ACTIVE: 'กำลังดำเนินการ',
      RESOLVED: 'คลี่คลาย',
      FALSE_ALARM: 'false alarm',
    }[s] || s
  );
}
