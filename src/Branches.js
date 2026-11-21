import { useState, useEffect, useCallback } from 'react';
import { API, postJSON } from './api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function to24(h, m, ampm) {
  const hour = (Number(h) % 12) + (ampm.toLowerCase() === 'pm' ? 12 : 0);
  return String(hour).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0');
}

function parseHours(text) {
  const m = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s*-\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(text || '');
  if (!m) return { open_from: 'Mon', open_to: 'Sat', open_time: '08:00', close_time: '18:00' };
  return { open_from: m[1], open_to: m[2], open_time: to24(m[3], m[4], m[5]), close_time: to24(m[6], m[7], m[8]) };
}

function BranchForm({ branch, onSaved }) {
  const [form, setForm] = useState(() => ({
    branch_name: branch.branch_name || '',
    address: branch.address || '',
    phone: branch.phone || '',
    ...parseHours(branch.opening_hours),
    latitude: branch.latitude || '',
    longitude: branch.longitude || '',
    reset_qr: false
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (form.close_time <= form.open_time) return setError('Closing time must be after opening time.');
    const addressChanged = form.address.trim() !== (branch.address || '');
    const coordsUnchanged = String(form.latitude) === String(branch.latitude || '') && String(form.longitude) === String(branch.longitude || '');
    const payload = { ...form, branch_id: branch.branch_id };
    if (addressChanged && coordsUnchanged) {
      payload.latitude = '';
      payload.longitude = '';
    }
    if (form.reset_qr && !window.confirm('Reset the attendance QR of ' + form.branch_name + '? Codes shown on the old QR screen stop working at once.')) return;
    setBusy(true);
    try {
      const result = await postJSON('/branches/update_branch.php', payload);
      if (result.success) onSaved(result.message);
      else setError(result.message);
    } catch (err) {
      setError('Could not connect to the server.');
    }
    setBusy(false);
  };

  return (
    <form className="panel branch-form" onSubmit={save}>
      <h3>{branch.branch_name}</h3>
      <div className="form-grid branch-grid">
        <label>Branch name <input value={form.branch_name} onChange={set('branch_name')} required /></label>
        <label>Phone <input value={form.phone} onChange={set('phone')} placeholder="03-1234 5678" /></label>
        <label className="wide">Address <input value={form.address} onChange={set('address')} required /></label>
        <label>Open from
          <select value={form.open_from} onChange={set('open_from')}>{DAYS.map(d => <option key={d}>{d}</option>)}</select>
        </label>
        <label>Open until
          <select value={form.open_to} onChange={set('open_to')}>{DAYS.map(d => <option key={d}>{d}</option>)}</select>
        </label>
        <label>Opens at <input type="time" value={form.open_time} onChange={set('open_time')} required /></label>
        <label>Closes at <input type="time" value={form.close_time} onChange={set('close_time')} required /></label>
        <label>Latitude <input value={form.latitude} onChange={set('latitude')} placeholder="3.0169609" /></label>
        <label>Longitude <input value={form.longitude} onChange={set('longitude')} placeholder="101.4358213" /></label>
      </div>
      <small>
        Opening days and hours set the delivery and pickup time slots, the closed days and late clock-ins.
        The map location is used for delivery distance; it is looked up again when you change the address and leave it as it is.
      </small>
      <label className="checkbox-line">
        <input type="checkbox" checked={form.reset_qr} onChange={set('reset_qr')} /> Reset the attendance QR secret (only if a code was shared outside the branch)
      </label>
      {error && <div className="notice alert">{error}</div>}
      <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save branch'}</button>
    </form>
  );
}

function Branches() {
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);

  const load = useCallback(() => {
    fetch(API + '/branches/get_branches.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => { if (result.success) setBranches(result.data); })
      .catch(() => setMessage('Could not load branches.'));
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  const saved = (text) => {
    setMessage(text);
    setVersion(v => v + 1);
  };

  return (
    <div>
      <p className="hint-line">These details are shown on the store, Our Stores page, footer and checkout.</p>
      {message && <div className="notice">{message}</div>}
      {branches.map(b => (
        <BranchForm key={b.branch_id + '-' + version} branch={b} onSaved={saved} />
      ))}
    </div>
  );
}

export default Branches;
