'use client';

// personnel API ส่ง first_name_th + last_name_th แยกกัน ไม่มี field name/full_name
export const getStudentName = (s) =>
  s?.name || s?.full_name ||
  ((s?.first_name_th || s?.last_name_th)
    ? `${s.first_name_th || ''} ${s.last_name_th || ''}`.trim()
    : null);

// personnel API ส่ง grade + section แยกกัน ไม่มี class_name
export const getClassName = (s) =>
  s?.class_name || s?.className ||
  (s?.grade && s?.section ? `${s.grade}/${s.section}` : null) ||
  (s?.class?.grade && s?.class?.section ? `${s.class.grade}/${s.class.section}` : null);
