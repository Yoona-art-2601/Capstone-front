import { useState, useEffect } from 'react';
import './Admin.css';
import Orders from './Orders';
import Inventory from './Inventory';
import Transfers from './Transfers';
import Warehouse from './Warehouse';
import Dashboard from './Dashboard';
import Login from './Login';
import NotificationBell from './NotificationBell';
import AuditTrail from './AuditTrail';
import Attendance from './Attendance';
import Users from './Users';
import Branches from './Branches';
import Incoming from './Incoming';
import { API } from './api';

const TABS = [
  { key: 'orders', label: 'Orders', staff: true },
  { key: 'inventory', label: 'Inventory', staff: true },
  { key: 'incoming', label: 'Incoming stock', staff: true },
  { key: 'transfers', label: 'Stock Transfers' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'users', label: 'Users' },
  { key: 'branches', label: 'Branches' },
  { key: 'audit', label: 'Audit Trail' },
];

const BRANCH_TABS = ['orders', 'inventory', 'incoming', 'transfers', 'dashboard', 'attendance'];
const PANEL_ROLES = ['Admin', 'Staff'];

function Admin() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch(API + '/auth/me.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success && PANEL_ROLES.includes(result.user.role)) setUser(result.user);
      })
      .catch(err => console.error('Error checking login:', err))
      .finally(() => setChecking(false));
  }, []);

  const [switchNotice, setSwitchNotice] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    const check = () => {
      if (document.hidden) return;
      fetch(API + '/auth/me.php', { credentials: 'include' })
        .then(res => res.json())
        .then(result => {
          const now = result.success ? result.user : null;
          if (now && now.user_id === user.user_id && PANEL_ROLES.includes(now.role)) return;
          setSwitchNotice(now
            ? 'This browser is now logged in as ' + now.name + ' (' + now.role + ') in another tab, so you were signed out of the panel. One browser keeps one login at a time: use a private window to test a second account.'
            : 'Your session has ended. Please log in again.');
          setUser(null);
        })
        .catch(() => {});
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [user]);

  const handleLogout = () => {
    fetch(API + '/auth/logout.php', { credentials: 'include' })
      .finally(() => setUser(null));
  };

  const handleLogin = () => {
    fetch(API + '/auth/me.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setSwitchNotice('');
          setUser(result.user);
        }
      });
  };

  if (checking) return <div className="login-page">Loading...</div>;
  if (!user) return <Login onLogin={handleLogin} notice={switchNotice} />;
  return <AdminPanel user={user} onLogout={handleLogout} />;
}

function AdminPanel({ user, onLogout }) {
  const isStaff = user.role === 'Staff';
  const tabs = TABS.filter(t => !isStaff || t.staff);
  const [tab, setTab] = useState('orders');
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(isStaff ? user.branch_id : 'all');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch(API + '/branches/get_branches.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setBranches(result.data);
      })
      .catch(err => console.error('Error fetching branches:', err));
  }, []);

  useEffect(() => {
    const query = branchId === 'all' ? '' : '?branch_id=' + branchId;
    fetch(API + '/stock/get_low_stock.php' + query, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setLowStockCount(result.data.length);
      })
      .catch(err => console.error('Error fetching low stock:', err));
  }, [branchId, refreshKey]);

  const openLink = (link) => {
    const [key, query] = link.split('?');
    if (!tabs.some(t => t.key === key)) return;
    const branch = Number(new URLSearchParams(query || '').get('branch'));
    if (branch && !isStaff) setBranchId(branch);
    setTab(key);
  };

  const usesBranch = BRANCH_TABS.includes(tab);

  return (
    <div className="admin">
      <header className="admin-header">
        <h1>Beacon Mart {isStaff ? 'Staff' : 'Admin'}</h1>
        <div className="admin-header-right">
          {isStaff ? (
            <span className="admin-scope">{user.branch_name}</span>
          ) : usesBranch ? (
            <label>
              Branch:{' '}
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All branches</option>
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                ))}
              </select>
            </label>
          ) : (
            <span className="admin-scope">All branches</span>
          )}
          <a href="/" className="admin-link">&larr; Back to store</a>
          <a href="/attendance" className="admin-link">Clock in / out</a>
          <NotificationBell variant="admin" onOpenLink={openLink} />
          <a href="/account" className="admin-user" title="My account and password">{user.name}</a>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <nav className="admin-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'inventory' && lowStockCount > 0 && (
              <span className="badge">{lowStockCount}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {tab === 'orders' && <Orders branchId={branchId} />}
        {tab === 'inventory' && (
          <Inventory branchId={branchId} canManage={!isStaff} onChange={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'incoming' && <Incoming branchId={branchId} onChange={() => setRefreshKey(k => k + 1)} />}
        {tab === 'transfers' && (
          <Transfers branchId={branchId} onChange={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'warehouse' && (
          <Warehouse branches={branches} onChange={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'dashboard' && <Dashboard branchId={branchId} />}
        {tab === 'attendance' && <Attendance branchId={branchId} branches={branches} />}
        {tab === 'users' && <Users branches={branches} me={user} />}
        {tab === 'branches' && <Branches />}
        {tab === 'audit' && <AuditTrail />}
      </main>
    </div>
  );
}

export default Admin;
