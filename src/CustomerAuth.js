import { useState } from 'react';
import { postJSON } from './api';

function CustomerAuth({ onLogin, onClose }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        const reg = await postJSON('/auth/register_customer.php', { name, email, password });
        if (!reg.success) {
          setError(reg.message);
          setSubmitting(false);
          return;
        }
      }
      const result = await postJSON('/auth/login.php', { email, password });
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Cannot connect to server.');
    }
    setSubmitting(false);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <form className="auth-box" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            Login
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>
            Register
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {mode === 'register' && (
          <label>
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            minLength={mode === 'register' ? 8 : undefined} required
          />
        </label>
        {mode === 'register' && <small className="auth-hint">At least 8 characters</small>}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
        </button>
        <button type="button" className="auth-cancel" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}

export default CustomerAuth;
