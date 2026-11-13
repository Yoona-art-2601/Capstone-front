import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';
import { API } from './api';

function AttendanceKiosk() {
  const [branchId] = useState(() => Number(new URLSearchParams(window.location.search).get('branch')) || 1);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [now, setNow] = useState(new Date());

  const load = useCallback(() => {
    fetch(API + '/attendance/qr_code.php?branch_id=' + branchId, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (!result.success) {
          setError(result.message);
          return;
        }
        setError('');
        setQr(result);
        setSecondsLeft(result.expires_in);
      })
      .catch(() => setError('Cannot connect to server.'));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setSecondsLeft(s => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (qr && secondsLeft <= 0) load();
  }, [qr, secondsLeft, load]);

  const link = qr ? window.location.origin + '/attendance?b=' + qr.branch_id + '&c=' + qr.code : '';

  return (
    <div className="kiosk">
      {error ? (
        <div className="kiosk-card">
          <h1>Attendance QR</h1>
          <p className="auth-error">{error}</p>
          <p>Log in to the <a href="/admin">admin panel</a> as an admin, then open the QR from the Attendance tab.</p>
        </div>
      ) : !qr ? (
        <div className="kiosk-card"><p>Loading...</p></div>
      ) : (
        <div className="kiosk-card">
          <span className="kiosk-brand">🌿 Beacon Mart</span>
          <h1>{qr.branch_name}</h1>
          <p className="kiosk-clock">
            {now.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {now.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
          </p>
          <div className="kiosk-qr">
            <QRCodeSVG value={link} size={280} level="M" marginSize={2} />
          </div>
          <p className="kiosk-instruction">Scan with your phone to clock in or out</p>
          <div className="kiosk-code" aria-label="Attendance code">{qr.code}</div>
          <div className="kiosk-timer">
            <div style={{ width: Math.max(0, (secondsLeft / qr.period) * 100) + '%' }} />
          </div>
          <small>New code in {Math.max(0, secondsLeft)}s · Opening hours: {qr.opening_hours}</small>
        </div>
      )}
    </div>
  );
}

export default AttendanceKiosk;
