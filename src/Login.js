import { useState } from 'react';

const API = 'http://localhost/beaconmart-project/backend';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(API + '/auth/login.php', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      if (!result.success) {
        setError(result.message);
      } else if (result.user.role !== 'Admin') {
        await fetch(API + '/auth/logout.php', { credentials: 'include' });
        setError('This account is not an admin account.');
      } else {
        onLogin(result.user);
      }
    } catch (err) {
      setError('Cannot connect to server.');
    }
    setSubmitting(false);
  };

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Beacon Mart Admin</h2>
        {error && <div className="notice alert">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Login'}
        </button>
        <a href="/" className="login-back">&larr; Back to store</a>
      </form>
    </div>
  );
}

export default Login;
