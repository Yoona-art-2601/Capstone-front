import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { PageShell } from './Layout';
import CustomerAuth from './CustomerAuth';
import { API, postJSON } from './api';
import { formatDate, formatDateTime, formatMinutes } from './format';

const timeOf = (value) => (value ? formatDateTime(value).split(', ').pop() : '');

function duration(from, to) {
  if (!from || !to) return '';
  return formatMinutes((new Date(to.replace(' ', 'T')) - new Date(from.replace(' ', 'T'))) / 60000);
}

function AttendancePage() {
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [state, setState] = useState({ loading: true, status: null, error: '', blocked: '' });
  const [branchId, setBranchId] = useState(Number(params.get('b')) || '');
  const [code, setCode] = useState((params.get('c') || '').toUpperCase());
  const [showAuth, setShowAuth] = useState(false);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(API + '/attendance/status.php', { credentials: 'include' })
      .then(res => res.json().then(body => ({ code: res.status, body })))
      .then(({ code: httpCode, body }) => {
        if (httpCode === 401) return setState({ loading: false, status: null, error: '', blocked: 'login' });
        if (httpCode === 403) return setState({ loading: false, status: null, error: '', blocked: 'customer' });
        if (!body.success) return setState({ loading: false, status: null, error: body.message, blocked: '' });
        setState({ loading: false, status: body, error: '', blocked: '' });
        if (body.my_branch_id) setBranchId(Number(body.my_branch_id));
        else if (body.record) setBranchId(id => id || Number(body.record.branch_id));
      })
      .catch(() => setState({ loading: false, status: null, error: 'Cannot connect to server.', blocked: '' }));
  }, []);

  useEffect(() => {
    load();
    if (window.location.search) window.history.replaceState({}, '', '/attendance');
  }, [load]);

  const status = state.status;
  const record = status && status.record;
  const action = !record ? 'in' : !record.clock_out ? 'out' : null;

  const submit = (e) => {
    e.preventDefault();
    setMessage(null);
    if (!branchId) return setMessage({ type: 'error', text: 'Please choose your branch.' });
    if (!/^[0-9A-Fa-f]{6}$/.test(code.trim())) return setMessage({ type: 'error', text: 'Enter the 6-character code shown under the QR code.' });
    setBusy(true);
    postJSON('/attendance/clock.php', { branch_id: branchId, code: code.trim(), action })
      .then(result => {
        setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        if (result.success) {
          setCode('');
          load();
        }
      })
      .catch(() => setMessage({ type: 'error', text: 'Cannot connect to server.' }))
      .finally(() => setBusy(false));
  };

  return (
    <PageShell>
      {showAuth && <CustomerAuth onLogin={() => { setShowAuth(false); load(); }} onClose={() => setShowAuth(false)} />}
      <div className="attendance-page">
        <div className="attendance-head">
          <h1>Staff Attendance</h1>
          {status && <a href="/admin" className="btn btn-ghost">&larr; Back to admin panel</a>}
        </div>

        {state.loading ? (
          <p className="message">Loading...</p>
        ) : state.blocked === 'login' ? (
          <section className="checkout-section">
            <h3>Log in with your staff account</h3>
            <p className="hint">After logging in you can clock in or out with the code from the branch QR.</p>
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>Login</button>
          </section>
        ) : state.blocked === 'customer' ? (
          <p className="message">This page is for Beacon Mart staff only.</p>
        ) : state.error ? (
          <p className="auth-error">{state.error}</p>
        ) : (
          <>
            <section className={'checkout-section attendance-status ' + (action === 'out' ? 'working' : action ? 'off' : 'done')}>
              <span className="attendance-date">{formatDate(status.today)}</span>
              {!record && <strong>You have not clocked in today</strong>}
              {record && !record.clock_out && (
                <>
                  <strong>Working at {record.branch_name}</strong>
                  <span>
                    Clocked in at {timeOf(record.clock_in)}
                    {Number(record.late_minutes) > 0 && <span className="late-tag">Late {formatMinutes(record.late_minutes)}</span>}
                  </span>
                </>
              )}
              {record && record.clock_out && (
                <>
                  <strong>Shift finished at {record.branch_name}</strong>
                  <span>{timeOf(record.clock_in)} – {timeOf(record.clock_out)} · {duration(record.clock_in, record.clock_out)}</span>
                </>
              )}
            </section>

            {action && (
              <form className="checkout-section" onSubmit={submit} noValidate>
                <h3>{action === 'in' ? 'Clock in' : 'Clock out'}</h3>
                <div className="field-grid">
                  <label>
                    Branch
                    <select value={branchId} onChange={(e) => setBranchId(Number(e.target.value))} disabled={action === 'out' || !!status.my_branch_id}>
                      <option value="">Choose branch</option>
                      {status.branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                    </select>
                  </label>
                  <label>
                    Code from the QR
                    <input
                      className="attendance-code" inputMode="text" maxLength={6} autoComplete="off" placeholder="Enter code"
                      value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ''))}
                    />
                  </label>
                </div>
                <small className="hint">
                  {action === 'out'
                    ? 'At the end of your shift, scan the QR code at the branch again to get a new code, then press Clock out now.'
                    : 'Scan the QR code at the branch to fill this in. The code changes every 2 minutes.'}
                </small>
                {message && <div className={'notice-bar ' + message.type}><span>{message.text}</span></div>}
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Please wait...' : action === 'in' ? 'Clock in now' : 'Clock out now'}
                </button>
              </form>
            )}
            {!action && message && <div className={'notice-bar ' + message.type}><span>{message.text}</span></div>}

            <section className="checkout-section">
              <h3>Your last 7 shifts</h3>
              {status.recent.length === 0 ? (
                <p className="hint">No attendance records yet.</p>
              ) : (
                <table className="order-items attendance-recent">
                  <tbody>
                    {status.recent.map(r => (
                      <tr key={r.attendance_id}>
                        <td>{formatDate(r.work_date)}<br /><small>{r.branch_name}</small></td>
                        <td>{timeOf(r.clock_in)} – {r.clock_out ? timeOf(r.clock_out) : r.work_date === status.today ? <span className="working-tag">Working</span> : <span className="late-tag">No clock-out</span>}</td>
                        <td className="num">
                          {duration(r.clock_in, r.clock_out)}
                          {Number(r.late_minutes) > 0 && <><br /><span className="late-tag">Late {formatMinutes(r.late_minutes)}</span></>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}

export default AttendancePage;
