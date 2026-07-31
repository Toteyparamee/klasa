'use client';

import { useEffect, useRef } from 'react';

// Web Client ID เดียวกับที่ Flutter (mobile + web) และ backend (GOOGLE_CLIENT_IDS)
// ใช้ — ต้องตรงกันเป๊ะ ไม่งั้น server verify id_token ไม่ผ่าน
const GOOGLE_CLIENT_ID = '718354289306-ej4grb7lpq7sbgotmts6ihicvtvt1hq8.apps.googleusercontent.com';

// ปุ่ม "เข้าสู่ระบบด้วย Google" สำหรับบัญชี Google Workspace for Education (GAFE)
// ใช้ Google Identity Services (GIS) SDK ตรงๆ ผ่าน <script> tag ใน layout.jsx
// (ไม่ต้องพึ่ง npm package ใดๆ — ต่างจาก Flutter web ที่ต้องใช้ google_sign_in_web
// เพราะที่นี่เป็นเว็บ JS ล้วน เรียก window.google.accounts.id ได้ตรงๆ)
//
// เฉพาะ user ที่มีอยู่ในระบบแล้วเท่านั้น — web control ไม่รองรับ self-onboard
// ผ่านรหัสนักเรียน+วันเกิดแบบฝั่ง mobile ดู GAFE_LOGIN_DESIGN.md §6.6
const GoogleSignInButton = ({ onIdToken, onError, disabled }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        // GIS script ยังโหลดไม่เสร็จ — ลองใหม่จนกว่าจะพร้อม
        setTimeout(tryInit, 100);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            onIdToken(response.credential);
          } else {
            onError?.(new Error('ไม่ได้รับ id_token จาก Google'));
          }
        },
      });

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 320,
        });
      }
    };

    tryInit();
    return () => { cancelled = true; };
  }, [onIdToken, onError]);

  return (
    <div
      ref={buttonRef}
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        display: 'flex',
        justifyContent: 'center',
      }}
    />
  );
};

export default GoogleSignInButton;
