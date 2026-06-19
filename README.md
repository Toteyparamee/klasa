# SchoolApp — Web Control (Admin Panel)

เว็บสำหรับผู้ดูแลระบบโรงเรียน ใช้จัดการข้อมูลมาสเตอร์ (ครู/นักเรียน/ห้องเรียน/ตารางเรียน), ตั้งค่าคะแนนความประพฤติ และดูแลบัญชีผู้ใช้ — คู่กับ mobile app ฝั่ง [Flutter](../app)

## Tech Stack

- React 19 + Vite 7
- React Router v7
- `xlsx` สำหรับ import/export นักเรียนแบบ batch
- ESLint 9 (flat config)

## โครงสร้างโปรเจกต์

```
web_control/
├── src/
│   ├── main.jsx                    # Entry point
│   ├── App.jsx                     # Routing + layout
│   ├── api/
│   │   ├── config.js               # API base URL
│   │   ├── authApi.js
│   │   ├── personnelApi.js         # นักเรียน / ครู / ห้อง / โรงเรียน
│   │   ├── scheduleApi.js          # ตารางเรียน / วิชา / ภาคเรียน
│   │   ├── behaviorApi.js          # คะแนนความประพฤติ
│   │   ├── schoolApi.js
│   │   └── settingsApi.js
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Modal.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── PersonnelManagement.jsx
│   │   ├── BehaviorManagement.jsx
│   │   ├── ScheduleManagement.jsx
│   │   ├── SubjectManagement.jsx
│   │   ├── SemesterSettings.jsx
│   │   ├── TeacherSchedule.jsx
│   │   ├── ClassroomForm.jsx / ClassroomFullForm.jsx
│   │   ├── StudentForm.jsx / StudentBatchUploadForm.jsx
│   │   └── TeacherForm.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── SchoolContext.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── PersonnelManagementPage.jsx
│   │   ├── BehaviorScorePage.jsx
│   │   ├── SchoolDetail.jsx
│   │   ├── SystemSettingsPage.jsx
│   │   └── UserManagementPage.jsx
│   ├── services/
│   │   └── api.js
│   └── css/                        # ไฟล์สไตล์แยกต่อคอมโพเนนต์
├── package.json
├── vite.config.js
└── eslint.config.js
```

## ฟีเจอร์หลัก

| หน้า | คำอธิบาย |
|------|----------|
| **Login** | เข้าสู่ระบบด้วย username/password (JWT ผ่าน login service) |
| **Admin Dashboard** | สรุปจำนวนผู้ใช้ / สถิติ |
| **Personnel Management** | เพิ่ม / แก้ไข นักเรียน + ครู พร้อม batch upload จาก Excel |
| **Classroom / School** | จัดการห้องเรียน, โรงเรียน, ข้อมูลโรงเรียน |
| **Schedule Management** | ตารางเรียนต่อห้อง / ต่อครู, นำเข้า/แก้ไขตาราง |
| **Subject Management** | รายวิชา + รหัสวิชา |
| **Semester Settings** | ตั้งค่าภาคเรียน/ปีการศึกษาปัจจุบัน |
| **Behavior Management** | หมวดหมู่คะแนนความประพฤติ (บวก/ลบ) |
| **System Settings** | ตั้งค่าทั่วไป |
| **User Management** | จัดการบัญชีผู้ใช้งาน |

## Development

### ติดตั้ง dependencies

```bash
npm install
```

### รัน dev server

```bash
npm run dev
```

เปิดที่ `http://localhost:5173` — Vite hot reload เปิดใช้อัตโนมัติ

### Build production

```bash
npm run build       # → dist/
npm run preview     # preview production build
```

### Lint

```bash
npm run lint
```

## API Configuration

ตั้งค่า base URL ของ backend ได้ที่ [src/api/config.js](src/api/config.js) — ค่า default จะชี้ไปที่ Kong gateway ที่ `http://localhost:30000`

| Service | Path prefix ผ่าน Kong |
|---------|---------------------|
| Login | `/server/...` |
| Personnel | `/api/v1/students`, `/api/v1/teachers`, `/api/v1/classes`, ... |
| Schedule | `/api/v1/schedules`, `/api/v1/subjects`, `/api/v1/semesters` |
| Behavior | `/api/behavior/...` |

> ดูโครงสร้าง backend + port mapping ได้ที่ [README โปรเจกต์หลัก](../README.md)

## Auth Flow

1. เข้าสู่ระบบที่หน้า Login → เรียก `POST /server/login`
2. เก็บ `access_token` / `token_type` ไว้ใน `localStorage`
3. `AuthContext` อ่าน token, แนบ `Authorization: Bearer <token>` ให้ทุก request ผ่าน `services/api.js`
4. `ProtectedRoute` block หน้าที่ต้อง login

## Notes

- เว็บนี้ **แยก deploy ต่างหาก** จาก mobile app — build ออกมาเป็น static files (`dist/`) นำไป serve ผ่าน nginx / Kong หรือ hosting อื่น
- ESLint config ใช้ flat format (eslint 9) — ดูกฎใน [eslint.config.js](eslint.config.js)
