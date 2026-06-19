'use client';

import { useState, useEffect } from 'react';
import { periodGridAPI } from '../api/scheduleApi';
import { API_CONFIG } from '../api/config';
import { useAuth } from '../context/AuthContext';
import { useSchoolId } from '../hooks/useSchoolId';

const DEFAULT_PERIOD_SLOTS = [
  { id: 1, label: 'คาบ 1', start: '08:30', end: '09:25', isBreak: false },
  { id: 2, label: 'คาบ 2', start: '09:25', end: '10:20', isBreak: false },
  { id: 3, label: 'คาบ 3', start: '10:20', end: '11:15', isBreak: false },
  { id: 4, label: 'คาบ 4', start: '11:15', end: '12:10', isBreak: false },
  { id: 5, label: 'พักกลางวัน', start: '12:10', end: '13:00', isBreak: true },
  { id: 6, label: 'คาบ 5', start: '13:00', end: '13:55', isBreak: false },
  { id: 7, label: 'คาบ 6', start: '13:55', end: '14:50', isBreak: false },
  { id: 8, label: 'คาบ 7', start: '14:50', end: '15:45', isBreak: false },
  { id: 9, label: 'คาบ 8', start: '15:45', end: '16:40', isBreak: false },
  { id: 10, label: 'คาบ 9', start: '16:40', end: '17:35', isBreak: false },
];

export const loadPeriodConfig = () => DEFAULT_PERIOD_SLOTS;

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const PeriodGridSettings = ({ onSave }) => {
  const { getValidToken } = useAuth();
  const schoolId = useSchoolId();
  const [slots, setSlots] = useState(DEFAULT_PERIOD_SLOTS);
  const [periodMinutes, setPeriodMinutes] = useState(55);
  const [breakMinutes, setBreakMinutes] = useState(50);
  const [startTime, setStartTime] = useState('08:30');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const token = await getValidToken();
        const data = await periodGridAPI.getConfig(schoolId, token);
        if (data.success && data.data?.slots) {
          const raw = typeof data.data.slots === 'string'
            ? JSON.parse(data.data.slots)
            : data.data.slots;
          const parsed = raw.map(s => ({
            ...s,
            isBreak: s.isBreak ?? s.is_break ?? false,
          }));
          setSlots(parsed);
        }
      } catch (e) {
        console.error('Failed to load period config:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [schoolId]);

  const handleLabelChange = (id, value) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, label: value } : s));
  };

  const handleStartChange = (id, value) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, start: value } : s));
  };

  const handleEndChange = (id, value) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, end: value } : s));
  };

  const handleBreakToggle = (id) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, isBreak: !s.isBreak } : s));
  };

  const handleAddRow = (afterId) => {
    const idx = slots.findIndex(s => s.id === afterId);
    const prev = slots[idx];
    const newStart = prev?.end || '08:00';
    const newEnd = minutesToTime(timeToMinutes(newStart) + 55);
    const newSlot = {
      id: Date.now(),
      label: 'คาบใหม่',
      start: newStart,
      end: newEnd,
      isBreak: false,
    };
    const updated = [...slots];
    updated.splice(idx + 1, 0, newSlot);
    setSlots(updated);
  };

  const handleDelete = (id) => {
    if (slots.length <= 1) return;
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const updated = [...slots];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setSlots(updated);
  };

  const handleMoveDown = (idx) => {
    if (idx === slots.length - 1) return;
    const updated = [...slots];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setSlots(updated);
  };

  const handleAutoGenerate = () => {
    let cursor = timeToMinutes(startTime);
    let periodCount = 1;
    const generated = slots.map((slot) => {
      const duration = slot.isBreak ? breakMinutes : periodMinutes;
      const end = cursor + duration;
      const result = {
        ...slot,
        start: minutesToTime(cursor),
        end: minutesToTime(end),
        label: slot.isBreak ? slot.label : `คาบ ${periodCount++}`,
      };
      cursor = end;
      return result;
    });
    setSlots(generated);
    setAutoGenOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = await getValidToken();
      const result = await periodGridAPI.saveConfig(slots, schoolId, token);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (onSave) onSave(slots);
      } else {
        setError(result.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (e) {
      setError(`เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('รีเซ็ตเป็นค่าเริ่มต้น?')) {
      setSlots(DEFAULT_PERIOD_SLOTS);
    }
  };

  const totalPeriods = slots.filter(s => !s.isBreak).length;
  const totalBreaks = slots.filter(s => s.isBreak).length;

  if (loading) {
    return (
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-400 rounded-full animate-spin"></div>
          <p className="text-gray-500">กำลังโหลดการตั้งค่า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-start pb-4 border-b-2 border-gray-200 flex-wrap gap-3">
        <div>
          <h3 className="m-0 mb-1 text-xl text-gray-700">ตั้งค่ากริดตารางสอน</h3>
          <p className="m-0 text-[13px] text-gray-400">กำหนดคาบเรียน ช่วงพัก และเวลาแต่ละคาบ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="py-2 px-4 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all bg-gradient-to-br from-indigo-400 to-purple-600 text-white hover:opacity-90 hover:-translate-y-px"
            onClick={() => setAutoGenOpen(o => !o)}
          >
            ⚡ สร้างอัตโนมัติ
          </button>
          <button
            className="py-2 px-4 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all bg-gray-100 text-gray-600 hover:bg-gray-200"
            onClick={handleReset}
          >
            ↺ รีเซ็ต
          </button>
          <button
            className={`py-2 px-4 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all text-white ${saved ? 'bg-green-300 cursor-default' : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-px'}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : saved ? '✓ บันทึกแล้ว' : '💾 บันทึก'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg py-2 px-4 text-sm">{error}</div>
      )}

      {autoGenOpen && (
        <div className="bg-indigo-50/50 border border-indigo-200/50 rounded-xl py-4 px-5 flex flex-col gap-3">
          <h4 className="m-0 text-[15px] text-indigo-500">สร้างเวลาอัตโนมัติ</h4>
          <div className="flex gap-6 flex-wrap max-sm:flex-col">
            <label className="flex flex-col gap-1.5 text-[13px] text-gray-600 font-semibold">
              เวลาเริ่มต้น
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="py-1.5 px-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-gray-600 font-semibold">
              ระยะเวลาต่อคาบ (นาที)
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button
                  className="w-8 h-8 border-none bg-gray-100 text-base font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => setPeriodMinutes(m => Math.max(10, m - 5))}
                >−</button>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={periodMinutes}
                  onChange={e => setPeriodMinutes(Number(e.target.value))}
                  className="w-14 border-none text-center text-sm text-gray-700 outline-none p-0"
                />
                <button
                  className="w-8 h-8 border-none bg-gray-100 text-base font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => setPeriodMinutes(m => Math.min(120, m + 5))}
                >+</button>
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-gray-600 font-semibold">
              ระยะเวลาพัก (นาที)
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button
                  className="w-8 h-8 border-none bg-gray-100 text-base font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => setBreakMinutes(m => Math.max(5, m - 5))}
                >−</button>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={breakMinutes}
                  onChange={e => setBreakMinutes(Number(e.target.value))}
                  className="w-14 border-none text-center text-sm text-gray-700 outline-none p-0"
                />
                <button
                  className="w-8 h-8 border-none bg-gray-100 text-base font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => setBreakMinutes(m => Math.min(120, m + 5))}
                >+</button>
              </div>
            </label>
          </div>
          <div className="text-xs text-gray-400 py-2 px-3 bg-white rounded-md border border-gray-200">
            คาบเรียน {totalPeriods} คาบ × {periodMinutes} นาที + ช่วงพัก {totalBreaks} ช่วง × {breakMinutes} นาที
          </div>
          <button
            className="self-start py-2 px-5 bg-indigo-400 text-white border-none rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-500 hover:-translate-y-px transition-all"
            onClick={handleAutoGenerate}
          >
            ✓ ใช้งาน
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <span className="py-1 px-3.5 rounded-2xl text-xs font-bold bg-indigo-100/50 text-indigo-500 border border-indigo-300/40">
          {totalPeriods} คาบเรียน
        </span>
        <span className="py-1 px-3.5 rounded-2xl text-xs font-bold bg-amber-100/50 text-amber-600 border border-amber-300/40">
          {totalBreaks} ช่วงพัก
        </span>
        {slots.length > 0 && (
          <span className="py-1 px-3.5 rounded-2xl text-xs font-bold bg-emerald-100/50 text-emerald-600 border border-emerald-300/40">
            {slots[0].start} – {slots[slots.length - 1].end}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-auto">
        <table className="w-full border-separate border-spacing-0 min-w-[600px]">
          <thead>
            <tr>
              <th className="w-9 py-3 px-2.5 bg-gradient-to-r from-indigo-400 to-purple-600 text-white text-[13px] font-semibold text-center border-b-2 border-purple-600">#</th>
              <th className="py-3 px-2.5 bg-gradient-to-r from-indigo-400 to-purple-600 text-white text-[13px] font-semibold text-center border-b-2 border-purple-600">ชื่อ</th>
              <th className="py-3 px-2.5 bg-gradient-to-r from-indigo-400 to-purple-600 text-white text-[13px] font-semibold text-center border-b-2 border-purple-600">เริ่ม</th>
              <th className="py-3 px-2.5 bg-gradient-to-r from-indigo-400 to-purple-600 text-white text-[13px] font-semibold text-center border-b-2 border-purple-600">สิ้นสุด</th>
              <th className="py-3 px-2.5 bg-gradient-to-r from-indigo-400 to-purple-600 text-white text-[13px] font-semibold text-center border-b-2 border-purple-600">ระยะ</th>
              <th className="py-3 px-2.5 bg-gradient-to-r from-indigo-400 to-purple-600 text-white text-[13px] font-semibold text-center border-b-2 border-purple-600">ประเภท</th>
              <th className="py-3 px-2.5 bg-gradient-to-r from-indigo-400 to-purple-600 text-white text-[13px] font-semibold text-center border-b-2 border-purple-600">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, idx) => {
              const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
              return (
                <tr
                  key={slot.id}
                  className={`transition-colors ${slot.isBreak ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                >
                  <td className="py-2 px-2.5 border-b border-gray-100 align-middle text-center text-xs text-gray-400 font-semibold">{idx + 1}</td>
                  <td className="py-2 px-2.5 border-b border-gray-100 align-middle text-center">
                    <input
                      className="border border-gray-200 rounded-md py-1.5 px-2 text-[13px] text-gray-700 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100/50 focus:bg-white transition-all w-32"
                      value={slot.label}
                      onChange={e => handleLabelChange(slot.id, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-2.5 border-b border-gray-100 align-middle text-center">
                    <input
                      className="border border-gray-200 rounded-md py-1.5 px-2 text-[13px] text-gray-700 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100/50 focus:bg-white transition-all w-24"
                      type="time"
                      value={slot.start}
                      onChange={e => handleStartChange(slot.id, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-2.5 border-b border-gray-100 align-middle text-center">
                    <input
                      className="border border-gray-200 rounded-md py-1.5 px-2 text-[13px] text-gray-700 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100/50 focus:bg-white transition-all w-24"
                      type="time"
                      value={slot.end}
                      onChange={e => handleEndChange(slot.id, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-2.5 border-b border-gray-100 align-middle text-center min-w-[80px]">
                    <span className={`inline-block py-0.5 px-2.5 rounded-xl text-xs font-semibold border ${duration < 0 ? 'bg-red-50 text-red-500 border-red-300/40' : 'bg-green-50 text-emerald-500 border-emerald-300/40'}`}>
                      {duration >= 0 ? `${duration} นาที` : '!'}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 border-b border-gray-100 align-middle text-center">
                    <button
                      className={`py-1 px-3 border rounded-2xl text-xs font-semibold cursor-pointer transition-all ${slot.isBreak
                        ? 'bg-amber-50 text-amber-600 border-amber-300/40 hover:bg-amber-100'
                        : 'bg-blue-50 text-blue-500 border-blue-300/40 hover:bg-blue-100'
                      }`}
                      onClick={() => handleBreakToggle(slot.id)}
                    >
                      {slot.isBreak ? '☕ พัก' : '📚 คาบ'}
                    </button>
                  </td>
                  <td className="py-2 px-2.5 border-b border-gray-100 align-middle text-center">
                    <div className="flex gap-1 justify-center flex-nowrap">
                      <button
                        title="ขึ้น"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="w-7 h-7 border border-gray-200 rounded-md bg-white text-[13px] cursor-pointer text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >↑</button>
                      <button
                        title="ลง"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === slots.length - 1}
                        className="w-7 h-7 border border-gray-200 rounded-md bg-white text-[13px] cursor-pointer text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >↓</button>
                      <button
                        title="เพิ่มแถวด้านล่าง"
                        onClick={() => handleAddRow(slot.id)}
                        className="w-7 h-7 border border-emerald-300/40 rounded-md bg-white text-[13px] cursor-pointer text-emerald-500 flex items-center justify-center hover:bg-green-50 hover:border-emerald-500 transition-all"
                      >+</button>
                      <button
                        title="ลบ"
                        onClick={() => handleDelete(slot.id)}
                        disabled={slots.length <= 1}
                        className="w-7 h-7 border border-red-300/40 rounded-md bg-white text-[13px] cursor-pointer text-red-500 flex items-center justify-center hover:bg-red-50 hover:border-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[13px] text-gray-500 py-2.5 px-3.5 bg-gray-50 rounded-lg border-l-[3px] border-indigo-400">
        💡 กดปุ่ม <strong>บันทึก</strong> เพื่อให้ตารางสอนใช้การตั้งค่าใหม่
      </div>
    </div>
  );
};

export default PeriodGridSettings;
