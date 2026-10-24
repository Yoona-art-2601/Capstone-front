import { useState, useEffect } from 'react';
import './App.css';
import { PageShell } from './Layout';
import { getJSON, postJSON } from './api';

const EMPTY_FORM = { current: '', next: '', confirm: '' };

function AccountPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getJSON('/auth/me.php')
      .then(result => { if (result.success) setUser(result.user); })
      .catch(() => setError('Cannot connect to server.'))
      .finally(() => setLoading(false));
  }, []);

  const setField = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setError('');
  };

  const changePassword = (e) => {
    e.preventDefault();
    setNotice('');
    if (!form.current || !form.next) return setError('Please fill in all password fields.');
    if (form.next.length < 8) return setError('The new password must be at least 8 characters.');
    if (form.next !== form.confirm) return setError('The new passwords do not match.');

    setSaving(true);
    postJSON('/auth/change_password.php', { current_password: form.current, new_password: form.next })
      .then(result => {
        if (result.success) {
          setForm(EMPTY_FORM);
          setNotice(result.message + '.');
        } else {
          setError(result.message);
        }
      })
      .catch(() => setError('Cannot connect to server.'))
      .finally(() => setSaving(false));
  };

  return (
    <PageShell>
      <div className="account-page">
        <h1>My Account</h1>
        {loading ? (
          <p className="message">Loading...</p>
        ) : !user ? (
          <p className="message">Please <a href="/">login on the store page</a> to manage your account.</p>
        ) : (
          <>
            <section className="checkout-section">
              <h3>Account details</h3>
              <dl className="account-details">
                <dt>Name</dt><dd>{user.name}</dd>
                <dt>Email</dt><dd>{user.email}</dd>
                <dt>Account type</dt><dd>{user.role === 'Admin' ? 'Administrator' : 'Customer'}</dd>
              </dl>
              <div className="account-links">
                <a href="/my-orders" className="btn btn-ghost btn-sm">My Orders</a>
                {user.role === 'Admin' && <a href="/admin" className="btn btn-ghost btn-sm">Admin panel</a>}
              </div>
            </section>

            <form className="checkout-section" onSubmit={changePassword} noValidate>
              <h3>Change password</h3>
              {notice && <div className="notice-bar success"><span>{notice}</span></div>}
              <div className="field-grid">
                <label className="span-2">
                  Current password
                  <input type="password" autoComplete="current-password" value={form.current} onChange={setField('current')} />
                </label>
                <label>
                  New password
                  <input type="password" autoComplete="new-password" value={form.next} onChange={setField('next')} />
                </label>
                <label>
                  Confirm new password
                  <input type="password" autoComplete="new-password" value={form.confirm} onChange={setField('confirm')} />
                </label>
              </div>
              <small className="hint">At least 8 characters. After 5 wrong current passwords, changing is paused for 15 minutes.</small>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Change password'}
              </button>
            </form>
          </>
        )}
      </div>
    </PageShell>
  );
}

export default AccountPage;
