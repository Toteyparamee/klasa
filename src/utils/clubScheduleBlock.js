// Helper สำหรับแทรก "block ชุมนุม" ลงในตารางสอน (ทั้ง TeacherSchedule และ ClassSchedule)
// ชุมนุมไม่ได้เป็น schedule record จริง — เป็น overlay ที่ frontend วาดจากค่ากลาง (club schedule-config)
// ทุกตารางแสดง block เดียวกันในวัน/คาบที่ตั้งไว้

const DAY_NAMES = {
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัสบดี',
  5: 'ศุกร์',
  6: 'เสาร์',
  7: 'อาทิตย์',
};

// หา period slot ที่ตรงกับหมายเลขคาบที่ตั้งใน club config
// period ในระบบชุมนุมคือหมายเลขคาบ (เช่น 8) — จับคู่กับ label ของ slot ที่ตั้งใน "ตั้งค่ากริดตารางสอน"
// (label เก็บเป็น "คาบ 8" ตรงๆ ซึ่งเป็นหมายเลขคาบจริง ไม่ตรงกับ array index เพราะมีคาบพักคั่น)
// fallback: ถ้าหา label ไม่เจอ ให้ใช้การนับลำดับคาบเรียน (ข้ามคาบพัก)
function findSlotForPeriod(periodSlots, period) {
  if (!Array.isArray(periodSlots) || !period) return null;

  const wantedLabel = `คาบ ${period}`;
  const byLabel = periodSlots.find(
    (s) => !(s.isBreak || s.is_break) && (s.label || '').trim() === wantedLabel,
  );
  if (byLabel) return byLabel;

  // fallback — นับเฉพาะคาบเรียน
  let teachingIndex = 0;
  for (const slot of periodSlots) {
    if (slot.isBreak || slot.is_break) continue;
    teachingIndex += 1;
    if (teachingIndex === period) return slot;
  }
  return null;
}

// สร้าง grid cell entry ของชุมนุม ถ้ามีค่ากลางที่ตั้งไว้ครบ — คืน null ถ้าตั้งค่าไม่ครบ
// grid = { dayName: { "HH:MM-HH:MM": cellData } } (mutate เข้าไปเลย)
export function injectClubBlock(grid, periodSlots, clubConfig) {
  if (!grid || !clubConfig) return grid;
  const dayName = DAY_NAMES[clubConfig.day_of_week];
  if (!dayName || !grid[dayName]) return grid;

  const slot = findSlotForPeriod(periodSlots, clubConfig.period);
  if (!slot) return grid;

  const start = (slot.start || '').substring(0, 5);
  const end = (slot.end || '').substring(0, 5);
  if (!start || !end) return grid;

  grid[dayName][`${start}-${end}`] = {
    isClub: true,
    subject: 'ชุมนุม',
    subjectCode: '',
    className: '',
    room: '',
    raw: null, // ไม่ใช่ schedule จริง — กันไม่ให้กดเข้า edit modal
  };
  return grid;
}
