import { useState, useEffect } from 'react';
import './Admin.css';
import Orders from './Orders';
import Inventory from './Inventory';
import Transfers from './Transfers'
import Dashboard from './Dashboard';

const API = 'http://localhost/beaconmart-project/backend';

const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'transfers', label: 'Stock Transfers' },
  { key: 'dashboard', label: 'Dashboard' },
];

function Admin() {
  const [tab, setTab] = useState('orders');
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('all');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch(API + '/branches/get_branches.php')
      .then(res => res.json())
      .then(result => {
        if (result.success) setBranches(result.data);
      })
      .catch(err => console.error('Error fetching branches:', err));
  }, []);

  // low-stock count shown on the Inventory tab
  useEffect(() => {
    const query = branchId === 'all' ? '' : '?branch_id=' + branchId;
    fetch(API + '/stock/get_low_stock.php' + query)
      .then(res => res.json())
      .then(result => {
        if (result.success) setLowStockCount(result.data.length);
      })
      .catch(err => console.error('Error fetching low stock:', err));
  }, [branchId, refreshKey]);

  return (
    <div className="admin">
      <header className="admin-header">
        <h1>Beacon Mart Admin</h1>
        <div className="admin-header-right">
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
          <a href="/" className="admin-link">&larr; Back to store</a>
        </div>
      </header>

      <nav className="admin-tabs">
        {TABS.map(t => (
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
          <Inventory branchId={branchId} onChange={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'transfers' && (
          <Transfers branchId={branchId} onChange={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'dashboard' && <Dashboard branchId={branchId} />}
      </main>
    </div>
  );
}

export default Admin;
