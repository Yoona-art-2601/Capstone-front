import { useState, useEffect } from 'react';
import './App.css';
import { PageShell } from './Layout';
import { API, postJSON } from './api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    postJSON('/auth/forgot_password.php', { email: email.trim() })
      .then(setResult)
      .catch(() => setResult({ success: false, message: 'Cannot connect to server.' }))
      .finally(() => setBusy(false));
  };

  return (
    <PageShell>
      <div className="account-page">
        <h1>Forgot password</h1>
        <form className="checkout-section" onSubmit={submit}>
          <p className="hint">Enter the email of your account. We will send you a link to choose a new password.</p>
          <div className="field-grid">
            <label className="span-2">
              Email
              <input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setResult(null); }} required />
            </label>
          </div>
          {result && <div className={result.success ? 'notice-bar success' : 'auth-error'}><span>{result.message}</span></div>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
        </form>
        <a href="/" className="btn btn-ghost">&larr; Back to the store</a>
      </div>
    </PageShell>
  );
}

export function ResetPasswordPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [check, setCheck] = useState(null);
  const [form, setForm] = useState({ next: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(API + '/auth/reset_password.php?token=' + encodeURIComponent(token))
      .then(res => res.json())
      .then(setCheck)
      .catch(() => setCheck({ success: false, message: 'Cannot connect to server.' }));
    if (window.location.search) window.history.replaceState({}, '', '/reset-password');
  }, [token]);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (form.next.length < 8) return setError('The new password must be at least 8 characters.');
    if (form.next !== form.confirm) return setError('The new passwords do not match.');
    setBusy(true);
    postJSON('/auth/reset_password.php', { token, new_password: form.next })
      .then(result => (result.success ? setDone(result) : setError(result.message)))
      .catch(() => setError('Cannot connect to server.'))
      .finally(() => setBusy(false));
  };

  return (
    <PageShell>
      <div className="account-page">
        <h1>Choose a new password</h1>
        {!check ? (
          <p className="message">Checking your link...</p>
        ) : done ? (
          <section className="checkout-section">
            <div className="notice-bar success"><span>{done.message}</span></div>
            <a href={done.role === 'Customer' ? '/' : '/admin'} className="btn btn-primary">Go to login</a>
          </section>
        ) : !check.success ? (
          <section className="checkout-section">
            <div className="auth-error">{check.message}</div>
            <a href="/forgot-password" className="btn btn-primary">Send a new link</a>
          </section>
        ) : (
          <form className="checkout-section" onSubmit={submit} noValidate>
            <p className="hint">Account: <strong>{check.email}</strong></p>
            <div className="field-grid">
              <label>
                New password
                <input type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
              </label>
              <label>
                Confirm new password
                <input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              </label>
            </div>
            <small className="hint">At least 8 characters.</small>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save new password'}</button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
