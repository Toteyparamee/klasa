'use client';

// SchoolLocationEditor — modal แก้ไข lat/lng + boundary polygon ของโรงเรียน
//
// วิธีใช้:
//   - คลิกแผนที่ครั้งแรก → วาง marker (lat/lng ของโรงเรียน)
//   - กดปุ่ม "วาด Polygon" → คลิกเพิ่มจุดทีละจุด → กด "จบ Polygon"
//   - กด "บันทึก" → ส่ง PUT schools/:id

import { useState, useCallback, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// แก้ icon หาย (Leaflet + Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── ClickHandler ────────────────────────────────────────────────
function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// ─── SchoolLocationEditor ────────────────────────────────────────
export default function SchoolLocationEditor({ school, onSave, onClose }) {
  const defaultCenter = [13.736717, 100.523186]; // กรุงเทพ fallback

  const initLat = school?.latitude ?? null;
  const initLng = school?.longitude ?? null;

  // parse boundary จาก school (array หรือ JSON string)
  const parseBoundary = () => {
    try {
      if (!school?.boundary) return [];
      const raw = typeof school.boundary === 'string'
        ? JSON.parse(school.boundary)
        : school.boundary;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  };

  const [marker, setMarker] = useState(
    initLat != null && initLng != null ? [initLat, initLng] : null
  );
  const [polygonPoints, setPolygonPoints] = useState(parseBoundary);
  const [drawingMode, setDrawingMode] = useState(false); // false = วาง marker, true = วาด polygon
  const [saving, setSaving] = useState(false);

  const center = marker ?? (polygonPoints.length > 0 ? polygonPoints[0] : defaultCenter);

  const handleMapClick = useCallback((latlng) => {
    if (drawingMode) {
      setPolygonPoints((pts) => [...pts, [latlng.lat, latlng.lng]]);
    } else {
      setMarker([latlng.lat, latlng.lng]);
    }
  }, [drawingMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        latitude: marker ? marker[0] : undefined,
        longitude: marker ? marker[1] : undefined,
        boundary: polygonPoints.length >= 3 ? polygonPoints : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>ตั้งค่าพิกัด — {school?.name}</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* ─── toolbar ─── */}
        <div style={styles.toolbar}>
          <button
            onClick={() => setDrawingMode(false)}
            style={{ ...styles.toolBtn, ...(drawingMode ? {} : styles.toolBtnActive) }}
          >
            📍 วาง Marker
          </button>
          <button
            onClick={() => setDrawingMode(true)}
            style={{ ...styles.toolBtn, ...(drawingMode ? styles.toolBtnActive : {}) }}
          >
            ✏️ วาด Polygon
          </button>
          {polygonPoints.length > 0 && (
            <button onClick={() => setPolygonPoints([])} style={styles.toolBtnDanger}>
              🗑 ล้าง Polygon
            </button>
          )}
          {marker && (
            <button onClick={() => setMarker(null)} style={styles.toolBtnDanger}>
              🗑 ล้าง Marker
            </button>
          )}
        </div>

        <p style={styles.hint}>
          {drawingMode
            ? `คลิกบนแผนที่เพื่อเพิ่มจุด (${polygonPoints.length} จุด — ต้องการอย่างน้อย 3 จุด)`
            : 'คลิกบนแผนที่เพื่อวาง marker ตำแหน่งโรงเรียน'}
        </p>

        {/* ─── map ─── */}
        <div style={styles.mapWrap}>
          <MapContainer
            center={center}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
            <ClickHandler onMapClick={handleMapClick} />
            {marker && <Marker position={marker} />}
            {polygonPoints.length >= 2 && (
              <Polygon positions={polygonPoints} pathOptions={{ color: '#2563eb' }} />
            )}
          </MapContainer>
        </div>

        {/* ─── coordinate display ─── */}
        <div style={styles.coords}>
          <span>
            📍 <strong>Lat:</strong> {marker ? marker[0].toFixed(6) : '—'}&nbsp;&nbsp;
            <strong>Lng:</strong> {marker ? marker[1].toFixed(6) : '—'}
          </span>
          <span>
            🔷 Polygon: {polygonPoints.length} จุด
            {polygonPoints.length > 0 && polygonPoints.length < 3 && (
              <span style={{ color: '#ef4444' }}> (ต้องการอย่างน้อย 3)</span>
            )}
          </span>
        </div>

        {/* ─── actions ─── */}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={saving}>
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            style={styles.saveBtn}
            disabled={saving || (!marker && polygonPoints.length < 3)}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    width: '90%', maxWidth: 720,
    padding: 24,
    display: 'flex', flexDirection: 'column', gap: 12,
    maxHeight: '90vh', overflow: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
  },
  toolbar: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
  },
  toolBtn: {
    padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
    background: '#f9fafb', cursor: 'pointer', fontSize: 13,
  },
  toolBtnActive: {
    background: '#2563eb', color: '#fff', borderColor: '#2563eb',
  },
  toolBtnDanger: {
    padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5',
    background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: 13,
  },
  hint: {
    margin: 0, fontSize: 13, color: '#6b7280',
  },
  mapWrap: {
    height: 380, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb',
  },
  coords: {
    display: 'flex', gap: 24, fontSize: 13, color: '#374151',
    background: '#f9fafb', borderRadius: 6, padding: '8px 12px',
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
  },
  cancelBtn: {
    padding: '8px 20px', borderRadius: 6, border: '1px solid #d1d5db',
    background: '#f9fafb', cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 20px', borderRadius: 6, border: 'none',
    background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600,
  },
};
