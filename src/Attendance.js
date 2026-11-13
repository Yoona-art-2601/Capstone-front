import { useState, useEffect, useCallback } from 'react';
import { API, postJSON } from './api';
import { formatDate, formatDateTime, formatMinutes } from './format';

const STATUS_FILTERS = [
  { value: '', label: 'All records' },
  { value: 'late', label: 'Late' },
  { value: 'early', label: 'Left early' },
  { value: 'missing', label: 'Missing clock-out' },
  { value: 'working', label: 'Working now' }
];

const hours = (minutes) => (minutes === null || minutes === undefined ? '-' : (Number(minutes) / 60).toFixed(2));
const timeOf = (value) => (value ? formatDateTime(value).split(', ').pop() : '');

function isoDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

function FixRow({ record, onDone }) {
  const [clockOut, setClockOut] = useState(record.work_date + 'T18:00');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const result = await postJSON('/attendance/fix_record.php', { attendance_id: record.attendance_id, clock_out: clockOut, note });
      onDone(result.success ? result.message + '.' : 'Error: ' + result.message, result.success);
    } catch (err) {
      onDone('Could not connect to the server.', false);
    }
    setBusy(false);
  };

  return (
    <tr className="details-row">
      <td colSpan="10">
        <div className="toolbar attendance-fix">
          <label>Clock-out <input type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} /></label>
          <label>Reason <input value={note} placeholder="e.g. Forgot to clock out, confirmed by manager" onChange={(e) => setNote(e.target.value)} /></label>
          <button onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save correction'}</button>
          <button onClick={() => onDone(null, false)}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function Attendance({ branchId, branches }) {
  const [dateFrom, setDateFrom] = useState(daysAgo(6));
  const [dateTo, setDateTo] = useState(isoDate(new Date()));
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [fixing, setFixing] = useState(null);

  const query = useCallback((extra) => {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, ...extra });
    if (branchId !== 'all') params.set('branch_id', branchId);
    if (userId) params.set('user_id', userId);
    if (status) params.set('status', status);
    return API + '/attendance/records.php?' + params;
  }, [dateFrom, dateTo, branchId, userId, status]);

  const load = useCallback(() => {
    fetch(query({ page }), { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result);
        else setMessage('Error: ' + result.message);
      })
      .catch(() => setMessage('Could not load attendance.'));
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, branchId, userId, status]);

  const downloadCsv = async () => {
    try {
      const res = await fetch(query({ format: 'csv' }), { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beacon-mart-attendance-' + dateFrom + '-to-' + dateTo + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Could not download the CSV file.');
    }
  };

  const fixDone = (text, ok) => {
    setFixing(null);
    if (text) setMessage(text);
    if (ok) load();
  };

  const isMissing = (r) => !r.clock_out && r.work_date < isoDate(new Date());

  return (
    <div>
      <div className="panel">
        <h3>Branch QR codes</h3>
        <p className="hint-line">
          Open the QR screen on a tablet or computer at the branch. Staff scan it with their phone to clock in and out.
          The code changes every 2 minutes, so a photo of it cannot be reused later.
        </p>
        <div className="toolbar">
          {branches.map(b => (
            <button key={b.branch_id} onClick={() => window.open('/attendance-qr?branch=' + b.branch_id, '_blank', 'noopener')}>
              Open QR screen: {b.branch_name}
            </button>
          ))}
          <a href="/attendance" target="_blank" rel="noopener noreferrer">Staff clock-in page</a>
        </div>
      </div>

      <div className="toolbar audit-toolbar">
        <label>From <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label>To <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} /></label>
        <label>Staff{' '}
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All staff</option>
            {data && data.staff.map(s => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
          </select>
        </label>
        <label>Show{' '}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <button onClick={load}>Refresh</button>
        <button onClick={downloadCsv}>Download CSV</button>
      </div>

      {message && <div className="notice">{message}</div>}

      {data && (
        <>
          <div className="panel">
            <h3>Summary by staff ({formatDate(data.date_from)} – {formatDate(data.date_to)})</h3>
            <table className="admin-table">
              <thead>
                <tr><th>Staff</th><th>Days worked</th><th>Hours worked</th><th>Late</th><th>Left early</th><th>Missing clock-out</th></tr>
              </thead>
              <tbody>
                {data.summary.length === 0 && <tr><td colSpan="6">No attendance in this period.</td></tr>}
                {data.summary.map(s => (
                  <tr key={s.user_id}>
                    <td>{s.staff_name}</td>
                    <td>{s.days}</td>
                    <td>{hours(s.worked_minutes)}</td>
                    <td>{Number(s.late_days) > 0 ? <span className="pill unpaid">{s.late_days} day(s), {formatMinutes(s.late_minutes)}</span> : 0}</td>
                    <td>{Number(s.early_days) > 0 ? <span className="pill unpaid">{s.early_days} day(s)</span> : 0}</td>
                    <td>{Number(s.missing_clock_out) > 0 ? <span className="pill cancelled">{s.missing_clock_out}</span> : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Records ({data.total})</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th><th>Staff</th><th>Branch</th><th>Clock in</th><th>Clock out</th>
                <th>Hours</th><th>Late</th><th>Left early</th><th>Note</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 && <tr><td colSpan="10">No records found.</td></tr>}
              {data.data.map(r => (
                <FragmentRow key={r.attendance_id} record={r} missing={isMissing(r)} fixing={fixing === r.attendance_id}
                  onFix={() => setFixing(r.attendance_id)} onDone={fixDone} />
              ))}
            </tbody>
          </table>

          {data.pages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>&larr; Prev</button>
              <span>Page {data.page} of {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next &rarr;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FragmentRow({ record: r, missing, fixing, onFix, onDone }) {
  return (
    <>
      <tr>
        <td className="nowrap">{formatDate(r.work_date)}</td>
        <td>{r.staff_name}</td>
        <td>{r.branch_name}</td>
        <td className="nowrap">{timeOf(r.clock_in)}</td>
        <td className="nowrap">
          {r.clock_out ? timeOf(r.clock_out) : missing ? <span className="pill cancelled">Missing</span> : <span className="pill paid">Working</span>}
        </td>
        <td>{hours(r.worked_minutes)}</td>
        <td>{Number(r.late_minutes) > 0 ? <span className="pill unpaid">{formatMinutes(r.late_minutes)}</span> : '-'}</td>
        <td>{Number(r.early_leave_minutes) > 0 ? <span className="pill unpaid">{formatMinutes(r.early_leave_minutes)}</span> : '-'}</td>
        <td><small>{r.note || ''}</small></td>
        <td>{(missing || r.clock_out) && !fixing && <button onClick={onFix}>{r.clock_out ? 'Edit clock-out' : 'Fix clock-out'}</button>}</td>
      </tr>
      {fixing && <FixRow record={r} onDone={onDone} />}
    </>
  );
}

export default Attendance;
