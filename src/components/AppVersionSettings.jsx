'use client';

import { useState, useEffect } from 'react';
import { versionAPI } from '../api';

const PLATFORMS = [
  { key: 'android', label: 'Android', icon: '🤖' },
  { key: 'ios', label: 'iOS', icon: '🍎' },
];

const emptyForm = {
  latest_version: '',
  minimum_version: '',
  build_number: '',
  download_url: '',
  release_notes: '',
};

const AppVersionSettings = () => {
  const [versions, setVersions] = useState({ android: null, ios: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [forms, setForms] = useState({ android: { ...emptyForm }, ios: { ...emptyForm } });

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await versionAPI.getAll();
      if (res.success) {
        const map = { android: null, ios: null };
        (res.data || []).forEach((v) => {
          if (v.is_active) map[v.platform] = v;
        });
        setVersions(map);
        setForms({
          android: map.android ? {
            latest_version: map.android.latest_version,
            minimum_version: map.android.minimum_version,
            build_number: String(map.android.build_number || ''),
            download_url: map.android.download_url,
            release_notes: map.android.release_notes || '',
          } : { ...emptyForm },
          ios: map.ios ? {
            latest_version: map.ios.latest_version,
            minimum_version: map.ios.minimum_version,
            build_number: String(map.ios.build_number || ''),
            download_url: map.ios.download_url,
            release_notes: map.ios.release_notes || '',
          } : { ...emptyForm },
        });
      } else {
        setError(res.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (e) {
      setError(e.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVersions(); }, []);

  const handleChange = (platform, field, value) => {
    setForms((prev) => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }));
  };

  const handleSave = async (platform) => {
    setSaving(platform);
    setError(null);
    setSuccess('');
    try {
      const form = forms[platform];
      const payload = {
        latest_version: form.latest_version.trim(),
        minimum_version: form.minimum_version.trim(),
        build_number: parseInt(form.build_number, 10) || 0,
        download_url: form.download_url.trim(),
        release_notes: form.release_notes.trim(),
      };
      const res = await versionAPI.upsert(platform, payload);
      if (res.success) {
        setSuccess(`บันทึก ${platform.toUpperCase()} สำเร็จ`);
        fetchVersions();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.message || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      setError(e.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving('');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#333', fontSize: '1.4rem' }}>จัดการเวอร์ชันแอป</h2>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {PLATFORMS.map(({ key, label, icon }) => (
          <div key={key} style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: '1.4rem' }}>{icon}</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>{label}</h3>
              {versions[key] && (
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888' }}>
                  ปัจจุบัน: v{versions[key].latest_version}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormRow label="เวอร์ชันล่าสุด *" placeholder="เช่น 1.0.1">
                <input
                  value={forms[key].latest_version}
                  onChange={(e) => handleChange(key, 'latest_version', e.target.value)}
                  placeholder="เช่น 1.0.1"
                  style={inputStyle}
                />
              </FormRow>

              <FormRow label="เวอร์ชันต่ำสุด * (ต่ำกว่านี้บังคับอัปเดต)">
                <input
                  value={forms[key].minimum_version}
                  onChange={(e) => handleChange(key, 'minimum_version', e.target.value)}
                  placeholder="เช่น 1.0.0"
                  style={inputStyle}
                />
              </FormRow>

              <FormRow label="Build Number">
                <input
                  type="number"
                  value={forms[key].build_number}
                  onChange={(e) => handleChange(key, 'build_number', e.target.value)}
                  placeholder="เช่น 4"
                  style={inputStyle}
                />
              </FormRow>

              <FormRow label="ลิงก์ดาวน์โหลด *">
                <input
                  value={forms[key].download_url}
                  onChange={(e) => handleChange(key, 'download_url', e.target.value)}
                  placeholder={key === 'ios' ? 'https://apps.apple.com/...' : 'https://play.google.com/...'}
                  style={inputStyle}
                />
              </FormRow>

              <FormRow label="Release Notes (แสดงใน update dialog)">
                <textarea
                  value={forms[key].release_notes}
                  onChange={(e) => handleChange(key, 'release_notes', e.target.value)}
                  placeholder={'• ฟีเจอร์ใหม่\n• แก้ไขบัก'}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </FormRow>

              <button
                onClick={() => handleSave(key)}
                disabled={saving === key}
                style={{
                  marginTop: 4,
                  padding: '10px 0',
                  background: saving === key ? '#aaa' : '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.95rem',
                  cursor: saving === key ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {saving === key ? 'กำลังบันทึก...' : `บันทึก ${label}`}
              </button>
            </div>
          </div>
        ))}
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

export default AppVersionSettings;
