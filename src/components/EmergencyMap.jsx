'use client';

// EmergencyMap — Leaflet + OpenStreetMap แสดงตำแหน่งทุก user
//
// Markers:
//   🟢 SAFE         — เขียว
//   🔴 NEED_HELP    — แดง
//   🟡 NO_RESPONSE  — เหลือง (ยังไม่กดอะไร)
//   ⚫ OFFLINE      — เทา (>60s ไม่ส่ง location)
//
// Dependency: leaflet + react-leaflet
//   npm i leaflet react-leaflet
//
// ⚠️  ถ้ายังไม่ติดตั้ง → component จะ throw — ลบ throw ออกเมื่อพร้อม

import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// แก้ icon หาย (Leaflet + Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const COLOR = {
  SAFE: '#22c55e',
  NEED_HELP: '#ef4444',
  NO_RESPONSE: '#eab308',
  OFFLINE: '#6b7280',
};

function pickColor(user) {
  if (!user.online) return COLOR.OFFLINE;
  if (user.status === 'SAFE') return COLOR.SAFE;
  if (user.status === 'NEED_HELP') return COLOR.NEED_HELP;
  return COLOR.NO_RESPONSE;
}

export default function EmergencyMap({ users, schoolCenter, schoolBoundary }) {
  // คำนวณจุดศูนย์กลาง: ใช้ schoolCenter ก่อน, fallback เฉลี่ยจาก users, แล้ว BKK
  const center = useMemo(() => {
    if (schoolCenter) return schoolCenter;
    if (!users || users.length === 0) return [13.7563, 100.5018];
    const avg = users.reduce(
      (acc, u) => ({ lat: acc.lat + u.lat, lng: acc.lng + u.lng }),
      { lat: 0, lng: 0 }
    );
    return [avg.lat / users.length, avg.lng / users.length];
  }, [users, schoolCenter]);

  return (
    <MapContainer
      center={center}
      zoom={18}
      style={{ height: '100%', width: '100%', borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* ขอบโรงเรียน */}
      {schoolBoundary && (
        <Polygon
          positions={schoolBoundary}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }}
        />
      )}

      {/* หมุดโรงเรียน */}
      {schoolCenter && (
        <Marker position={schoolCenter}>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            🏫 โรงเรียน
          </Tooltip>
        </Marker>
      )}

      {/* ผู้ใช้ */}
      {(users || []).map((u) => (
        <CircleMarker
          key={u.user_id}
          center={[u.lat, u.lng]}
          radius={8}
          pathOptions={{
            color: pickColor(u),
            fillColor: pickColor(u),
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Tooltip>
            <div style={{ fontSize: 13 }}>
              <div><b>User #{u.user_id}</b></div>
              <div>สถานะ: {labelStatus(u.status, u.online)}</div>
              {u.battery > 0 && <div>แบต: {u.battery}%</div>}
              {u.accuracy > 0 && <div>ความแม่นยำ: ±{u.accuracy.toFixed(0)} ม.</div>}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function labelStatus(status, online) {
  if (!online) return 'ออฟไลน์';
  return { SAFE: 'ปลอดภัย', NEED_HELP: 'ขอความช่วยเหลือ' }[status] || 'ยังไม่ตอบ';
}
