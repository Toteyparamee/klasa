'use client';

import { useState, useEffect, useCallback } from 'react';
import { scheduleAPI, getToken } from '../api';

const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.replace('.', ':').split(':').map(Number);
  return h * 60 + (m || 0);
};

// โหลดตารางสอนทั้งโรงเรียนของ semester/ปีการศึกษาที่ระบุ (ครั้งเดียว, cache ใน state)
// แล้วให้ checkConflict() เช็คว่าห้องเรียนนี้ วันนี้ ช่วงเวลานี้ ชนกับวิชาที่มีอยู่แล้วหรือไม่
export const useScheduleConflict = (schoolId, semester, academicYear) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const hasParams = Boolean(schoolId && semester && academicYear);

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    if (!hasParams) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const token = getToken();
        const data = await scheduleAPI.getSchedules({ schoolId, semester, academicYear }, token);
        if (!cancelled) setSchedules(data.success && data.data ? data.data : []);
      } catch (error) {
        console.error('Failed to load schedules for conflict check:', error);
        if (!cancelled) setSchedules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [hasParams, schoolId, semester, academicYear, reloadTick]);

  // คืน schedule ที่ชนกับพารามิเตอร์ที่ส่งเข้ามา (ถ้ามี) หรือ null ถ้าคาบว่าง
  const checkConflict = useCallback(({ classId, dayOfWeek, startTime, endTime, excludeScheduleId }) => {
    if (!hasParams || !classId || !dayOfWeek || !startTime || !endTime) return null;

    const cid = parseInt(classId);
    const day = parseInt(dayOfWeek);
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (start >= end) return null;

    return schedules.find((s) => {
      if (s.class_id !== cid || s.day_of_week !== day) return false;
      if (excludeScheduleId && s.id === excludeScheduleId) return false;
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      return start < sEnd && end > sStart;
    }) || null;
  }, [hasParams, schedules]);

  return { checkConflict, reloadSchedules: reload, schedulesLoading: loading };
};
