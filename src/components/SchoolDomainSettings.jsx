'use client';

import { useState, useEffect } from 'react';
import { schoolDomainAPI } from '../api';
import { useSchool } from '../context/SchoolContext';

const ROLE_OPTIONS = [
  { key: 'student', label: 'นักเรียน' },
  { key: 'teacher', label: 'ครู' },
];

const emptyForm = {
  school_id: '',
  domain: '',
  allowed_roles: ['student'],
  allow_jit: true,
  note: '',
};

// SchoolDomainSettings — จัดการ mapping โดเมนอีเมล GAFE (Google Workspace for
// Education) → โรงเรียน สำหรับ login ด้วย Google (ดู GAFE_LOGIN_DESIGN.md)
//
// โดเมนที่ไม่ได้อยู่ในตารางนี้ = login ด้วย Google ไม่ผ่าน (SCHOOL_NOT_ENABLED)
// ไม่ว่าจะเป็นโดเมนอะไรก็ตาม — ตั้งใจออกแบบให้ปลอดภัยเป็นค่าเริ่มต้น (deny-by-default)
const SchoolDomainSettings = () => {
  const { schools } = useSchool();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await schoolDomainAPI.getAll();
      if (res.success) {
        setDomains(res.data || []);
      } else {
        setError(res.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (e) {
      setError(e.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDomains(); }, []);

  const schoolName = (schoolId) =>
    schools.find((s) => String(s.id) === String(schoolId))?.name || `#${schoolId}`;

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const startEdit = (d) => {
    setEditingId(d.id);
    setForm({
      school_id: String(d.school_id),
      domain: d.domain,
      allowed_roles: d.allowed_roles && d.allowed_roles.length ? d.allowed_roles : ['student'],
      allow_jit: !!d.allow_jit,
      note: d.note || '',
    });
  };

  const toggleRole = (role) => {
    setForm((prev) => {
      const has = prev.allowed_roles.includes(role);
      const next = has
        ? prev.allowed_roles.filter((r) => r !== role)
        : [...prev.allowed_roles, role];
      return { ...prev, allowed_roles: next };
    });
  };

  const handleSave = async () => {
    setError(null);
    setSuccess('');

    const domain = form.domain.trim().toLowerCase();
    if (!domain) { setError('กรุณากรอกโดเมน'); return; }
    if (!editingId && !form.school_id) { setError('กรุณาเลือกโรงเรียน'); return; }
    if (form.allowed_roles.length === 0) { setError('กรุณาเลือกอย่างน้อย 1 บทบาท'); return; }

    setSaving(true);
    try {
      if (editingId) {
        const res = await schoolDomainAPI.update(editingId, {
          domain,
          allow_jit: form.allow_jit,
          allowed_roles: form.allowed_roles,
          note: form.note.trim(),
        });
        if (!res.success) throw new Error(res.message || 'แก้ไขไม่สำเร็จ');
        setSuccess('แก้ไขโดเมนสำเร็จ');
      } else {
        const res = await schoolDomainAPI.create({
          school_id: parseInt(form.school_id, 10),
          domain,
          allow_jit: form.allow_jit,
          allowed_roles: form.allowed_roles,
          note: form.note.trim(),
        });
        if (!res.success) throw new Error(res.message || 'สร้างไม่สำเร็จ');
        setSuccess('เพิ่มโดเมนสำเร็จ');
      }
      resetForm();
      fetchDomains();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (d) => {
    setError(null);
    try {
      const res = await schoolDomainAPI.update(d.id, { is_active: !d.is_active });
      if (!res.success) throw new Error(res.message || 'เปลี่ยนสถานะไม่สำเร็จ');
      fetchDomains();
    } catch (e) {
      setError(e.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`ลบโดเมน "${d.domain}" ออกจากระบบ?`)) return;
    setError(null);
    try {
      const res = await schoolDomainAPI.remove(d.id);
      if (!res.success) throw new Error(res.message || 'ลบไม่สำเร็จ');
      fetchDomains();
    } catch (e) {
      setError(e.message || 'เกิดข้อผิดพลาด');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#333', fontSize: '1.4rem' }}>
          โดเมนอีเมลโรงเรียน (Google Sign-In)
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#888' }}>
          นักเรียน/ครูจะ login ด้วยบัญชี Google Workspace ได้ก็ต่อเมื่อโดเมนอีเมล
          ของโรงเรียนถูกเพิ่มไว้ที่นี่เท่านั้น
        </p>
      </div>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      {/* ฟอร์มเพิ่ม/แก้ไข */}
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, background: '#fafafa', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#333' }}>
          {editingId ? 'แก้ไขโดเมน' : 'เพิ่มโดเมนใหม่'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormRow label="โรงเรียน *">
            <select
              value={form.school_id}
              onChange={(e) => setForm((p) => ({ ...p, school_id: e.target.value }))}
              disabled={!!editingId}
              style={inputStyle}
            >
              <option value="">-- เลือกโรงเรียน --</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormRow>

          <FormRow label="โดเมนอีเมล * (เช่น srimo.ac.th)">
            <input
              value={form.domain}
              onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
              placeholder="srimo.ac.th"
              style={inputStyle}
            />
          </FormRow>

          <FormRow label="บทบาทที่อนุญาต *">
            <div style={{ display: 'flex', gap: 16, paddingTop: 6 }}>
              {ROLE_OPTIONS.map((r) => (
                <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: '#444', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.allowed_roles.includes(r.key)}
                    onChange={() => toggleRole(r.key)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </FormRow>

          <FormRow label="อนุญาตให้ยืนยันตัวตนเอง (JIT)">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: '#444', cursor: 'pointer', paddingTop: 6 }}>
              <input
                type="checkbox"
                checked={form.allow_jit}
                onChange={(e) => setForm((p) => ({ ...p, allow_jit: e.target.checked }))}
              />
              เปิด — login ครั้งแรกกรอกรหัสนักเรียน+วันเกิดเพื่อยืนยันตัวตนเองได้
            </label>
          </FormRow>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormRow label="หมายเหตุ">
              <input
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="เช่น ทดสอบ, ผู้ดูแล..."
                style={inputStyle}
              />
            </FormRow>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: saving ? '#aaa' : '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มโดเมน'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: '#fff',
                color: '#555',
                border: '1px solid #ccc',
                borderRadius: 6,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* ตารางรายการ */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
              <th style={thStyle}>โรงเรียน</th>
              <th style={thStyle}>โดเมน</th>
              <th style={thStyle}>บทบาท</th>
              <th style={thStyle}>JIT</th>
              <th style={thStyle}>สถานะ</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  ยังไม่มีโดเมนที่เปิดใช้งาน
                </td>
              </tr>
            )}
            {domains.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{schoolName(d.school_id)}</td>
                <td style={tdStyle}><code>{d.domain}</code></td>
                <td style={tdStyle}>{(d.allowed_roles || []).join(', ')}</td>
                <td style={tdStyle}>{d.allow_jit ? '✓' : '—'}</td>
                <td style={tdStyle}>
                  <span style={{ color: d.is_active ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                    {d.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <button onClick={() => startEdit(d)} style={linkBtnStyle}>แก้ไข</button>
                  <button onClick={() => handleToggleActive(d)} style={linkBtnStyle}>
                    {d.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                  </button>
                  <button onClick={() => handleDelete(d)} style={{ ...linkBtnStyle, color: '#c62828' }}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FormRow = ({ label, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: 4 }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: '0.9rem',
  boxSizing: 'border-box',
};

const thStyle = {
  padding: '8px 12px',
  color: '#666',
  fontWeight: 600,
  fontSize: '0.85rem',
};

const tdStyle = {
  padding: '10px 12px',
  color: '#333',
};

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#1976d2',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '4px 8px',
};

export default SchoolDomainSettings;
