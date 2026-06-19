'use client';

// EmergencyWS — wrapper สำหรับ WebSocket connection ที่ /api/emergency/:id/live
//
// Features:
//   - Auto-reconnect (exponential backoff: 1s, 2s, 4s, 8s, max 30s)
//   - Event listeners: onSnapshot, onUserUpdate, onStatusUpdate, onResolved
//   - Heartbeat detection (server ส่ง ping ทุก 30s; ถ้าหายไป 60s → reconnect)
//
// Server protocol (ดู emergency_api/handlers/ws.go):
//   { type: "snapshot",       data: { users: [...], alert_id } }
//   { type: "user_update",    data: { user_id, lat, lng, ... } }
//   { type: "status_update",  data: { user_id, status, ... } }
//   { type: "alert_resolved", data: { alert_id } }
//   { type: "ping",           ts }

export class EmergencyWS {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = {
      snapshot: [],
      userUpdate: [],
      statusUpdate: [],
      resolved: [],
      open: [],
      close: [],
      error: [],
    };
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    this.lastPingAt = Date.now();
    this.heartbeatTimer = null;
  }

  connect() {
    this.shouldReconnect = true;
    this._open();
  }

  _open() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.lastPingAt = Date.now();
      this._startHeartbeatCheck();
      this.handlers.open.forEach((h) => h());
    };
    this.ws.onmessage = (e) => this._dispatch(e.data);
    this.ws.onclose = () => {
      this._stopHeartbeatCheck();
      this.handlers.close.forEach((h) => h());
      if (this.shouldReconnect) this._scheduleReconnect();
    };
    this.ws.onerror = (e) => {
      this.handlers.error.forEach((h) => h(e));
    };
  }

  _dispatch(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'snapshot':
        this.handlers.snapshot.forEach((h) => h(msg.data));
        break;
      case 'user_update':
        this.handlers.userUpdate.forEach((h) => h(msg.data));
        break;
      case 'status_update':
        this.handlers.statusUpdate.forEach((h) => h(msg.data));
        break;
      case 'alert_resolved':
        this.handlers.resolved.forEach((h) => h(msg.data));
        break;
      case 'ping':
        this.lastPingAt = Date.now();
        break;
    }
  }

  _scheduleReconnect() {
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    setTimeout(() => {
      if (this.shouldReconnect) this._open();
    }, delay);
  }

  _startHeartbeatCheck() {
    this._stopHeartbeatCheck();
    // ถ้า ping หาย > 60s → ถือว่า connection ตาย → ปิดให้ onclose ทำ reconnect
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPingAt > 60000) {
        this.ws?.close();
      }
    }, 15000);
  }

  _stopHeartbeatCheck() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  on(event, handler) {
    if (this.handlers[event]) this.handlers[event].push(handler);
    return this;
  }

  close() {
    this.shouldReconnect = false;
    this._stopHeartbeatCheck();
    this.ws?.close();
  }
}

export default EmergencyWS;
