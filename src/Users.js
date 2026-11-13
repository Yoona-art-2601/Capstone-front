import { useState, useEffect, useCallback } from 'react';
import { API, postJSON } from './api';
import { formatDate } from './format';

const ROLES = ['Admin', 'Staff', 'Customer'];
const EMPTY = { user_id: 0, name: '', email: '', role: 'Staff', branch_id: '', password: '' };

function UserForm({ initial, branches, onSaved, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isNew = !initial.user_id;
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (form.role === 'Staff' && !form.branch_id) return setError('Choose the branch this staff member works at.');
    if (isNew && form.password.length < 8) return setError('The first password must be at least 8 characters.');
    setBusy(true);
    try {
      const result = await postJSON('/users/save_user.php', { ...form, branch_id: form.role === 'Staff' ? Number(form.branch_id) : null });
      if (result.success) onSaved(result.message + '.');
      else setError(result.message);
    } catch (err) {
      setError('Could not connect to the server.');
    }
    setBusy(false);
  };

  return (
    <form className="form-box" onSubmit={save}>
      <h3>{isNew ? 'New account' : 'Edit ' + initial.name}</h3>
      <div className="form-grid">
        <label>Name <input value={form.name} onChange={set('name')} required /></label>
        <label>Email <input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>Role
          <select value={form.role} onChange={set('role')}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        {form.role === 'Staff' && (
          <label>Branch
            <select value={form.branch_id} onChange={set('branch_id')}>
              <option value="">Choose branch</option>
              {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
            </select>
          </label>
        )}
        {isNew && (
          <label>First password <input type="text" value={form.password} onChange={set('password')} placeholder="At least 8 characters" /></label>
        )}
      </div>
      <small>
        Staff can process orders and record stock in/out for their branch only, and clock in at that branch.
        Admins can use everything. {isNew && 'Give the first password to the person and ask them to change it on My Account.'}
      </small>
      {error && <div className="notice alert">{error}</div>}
      <div className="toolbar">
        <button type="submit" disabled={busy}>{busy ? 'Saving...' : isNew ? 'Create account' : 'Save changes'}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ResetPassword({ user, onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const result = await postJSON('/users/reset_password.php', { user_id: user.user_id, new_password: password });
      onDone(result.success ? result.message + '.' : 'Error: ' + result.message, result.success);
    } catch (err) {
      onDone('Could not connect to the server.', false);
    }
    setBusy(false);
  };

  return (
    <tr className="details-row">
      <td colSpan="7">
        <div className="toolbar">
          <label>New password for {user.name}{' '}
            <input type="text" value={password} placeholder="At least 8 characters" onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button onClick={save} disabled={busy || password.length < 8}>{busy ? 'Saving...' : 'Set password'}</button>
          <button onClick={() => onDone(null, false)}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function Users({ branches, me }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page });
    if (search.trim()) params.set('search', search.trim());
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    fetch(API + '/users/list_users.php?' + params, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result);
        else setMessage('Error: ' + result.message);
      })
      .catch(() => setMessage('Could not load users.'));
  }, [page, search, role, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, role, status]);

  const saved = (text) => {
    setEditing(null);
    setMessage(text);
    load();
  };

  const toggleActive = async (user) => {
    const enable = !Number(user.is_active);
    if (!enable && !window.confirm('Disable ' + user.name + '? They will be logged out and cannot log in until enabled again.')) return;
    try {
      const result = await postJSON('/users/set_active.php', { user_id: user.user_id, active: enable });
      setMessage(result.success ? result.message + '.' : 'Error: ' + result.message);
      if (result.success) load();
    } catch (err) {
      setMessage('Could not connect to the server.');
    }
  };

  const resetDone = (text) => {
    setResetting(null);
    if (text) setMessage(text);
  };

  const count = (r) => (data ? data.counts.find(c => c.role === r) || { total: 0, active: 0 } : { total: 0, active: 0 });

  return (
    <div>
      <div className="cards">
        {ROLES.map(r => (
          <div className="card" key={r}>
            <div className="label">{r === 'Staff' ? 'Staff' : r + 's'}</div>
            <div className="value">{count(r).total}</div>
            <div className="sub">{count(r).active} active</div>
          </div>
        ))}
      </div>

      <div className="toolbar audit-toolbar">
        <input type="search" placeholder="Search name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Active and disabled</option>
          <option value="active">Active only</option>
          <option value="disabled">Disabled only</option>
        </select>
        <button onClick={() => setEditing(EMPTY)}>+ New account</button>
      </div>

      {editing && (
        <UserForm key={editing.user_id || 'new'} initial={editing} branches={branches} onSaved={saved} onCancel={() => setEditing(null)} />
      )}
      {message && <div className="notice">{message}</div>}

      {data && (
        <>
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Branch</th><th>Status</th><th>Orders</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.data.length === 0 && <tr><td colSpan="7">No users found.</td></tr>}
              {data.data.map(u => (
                <UserRow key={u.user_id} user={u} isMe={u.user_id === data.me} resetting={resetting === u.user_id}
                  onEdit={() => setEditing({ user_id: u.user_id, name: u.name, email: u.email, role: u.role, branch_id: u.branch_id || '', password: '' })}
                  onToggle={() => toggleActive(u)} onReset={() => setResetting(u.user_id)} onResetDone={resetDone} />
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
      {me && <small className="hint-line">You are logged in as {me.name}. You cannot disable your own account or remove your own admin role.</small>}
    </div>
  );
}

function UserRow({ user: u, isMe, resetting, onEdit, onToggle, onReset, onResetDone }) {
  const active = Number(u.is_active) === 1;
  return (
    <>
      <tr className={active ? '' : 'low-row'}>
        <td>{u.name}{isMe && <small> (you)</small>}<br /><small>{u.email}{u.phone ? ' · ' + u.phone : ''}</small></td>
        <td><span className={'pill ' + (u.role === 'Admin' ? 'audit danger' : u.role === 'Staff' ? 'audit login' : 'audit')}>{u.role}</span></td>
        <td>{u.role === 'Staff' ? u.branch_name || '-' : u.role === 'Admin' ? 'All branches' : '-'}</td>
        <td><span className={'pill ' + (active ? 'paid' : 'cancelled')}>{active ? 'Active' : 'Disabled'}</span></td>
        <td>{u.orders}</td>
        <td className="nowrap">{formatDate(u.created_at)}</td>
        <td className="nowrap">
          <button onClick={onEdit}>Edit</button>{' '}
          <button onClick={onReset}>Reset password</button>{' '}
          {!isMe && <button className={active ? 'danger' : ''} onClick={onToggle}>{active ? 'Disable' : 'Enable'}</button>}
        </td>
      </tr>
      {resetting && <ResetPassword user={u} onDone={onResetDone} />}
    </>
  );
}

export default Users;
