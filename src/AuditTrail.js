import { useState, useEffect, useCallback } from 'react';
import { API } from './api';
import { formatDateTime } from './format';

const ACTION_CLASS = {
  LOGIN: 'login',
  LOGOUT: 'login',
  LOGIN_FAILED: 'danger',
  LOGIN_LOCKED: 'danger',
  ADMIN_CODE_FAILED: 'danger',
  PASSWORD_CHANGE: 'login',
  PASSWORD_CHANGE_FAILED: 'danger',
  REGISTER_ADMIN: 'danger',
  PRODUCT_DELETE: 'danger',
  ORDER_STATUS: 'order',
  ORDER_CREATE: 'order',
  STOCK_UPDATE: 'stock',
  STOCK_TRANSFER: 'stock',
  THRESHOLD_UPDATE: 'stock',
  PRODUCT_ADD: 'product',
  PRODUCT_UPDATE: 'product',
  PRODUCT_IMAGE: 'product',
  ORDER_CANCEL: 'order',
  FACTORY_RECEIPT: 'stock',
  WAREHOUSE_DISPATCH: 'stock',
  WAREHOUSE_RECEIVED: 'stock',
  WAREHOUSE_DISPATCH_CANCEL: 'danger',
};

function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ page });
    if (action) params.set('action', action);
    if (search.trim()) params.set('search', search.trim());
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    setLoading(true);
    fetch(API + '/audit/get_audit_logs.php?' + params, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setLogs(result.data);
          setActions(result.actions);
          setTotal(result.total);
          setPages(result.pages);
          setError('');
        } else {
          setError(result.message);
        }
      })
      .catch(() => setError('Cannot connect to server.'))
      .finally(() => setLoading(false));
  }, [page, action, search, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setAction('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div>
      <div className="toolbar audit-toolbar">
        <label>
          Action:{' '}
          <select value={action} onChange={changeFilter(setAction)}>
            <option value="">All</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>
          From: <input type="date" value={dateFrom} onChange={changeFilter(setDateFrom)} />
        </label>
        <label>
          To: <input type="date" value={dateTo} onChange={changeFilter(setDateTo)} />
        </label>
        <input
          type="text" placeholder="Search user or details" value={search}
          onChange={changeFilter(setSearch)}
        />
        <button onClick={clearFilters}>Clear</button>
        <button onClick={load}>Refresh</button>
        <span>{total} record(s)</span>
      </div>

      {error && <div className="notice alert">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Details</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {!loading && logs.length === 0 && (
            <tr><td colSpan="5">No audit records found.</td></tr>
          )}
          {logs.map(log => (
            <tr key={log.log_id}>
              <td className="nowrap">{formatDateTime(log.created_at)}</td>
              <td>
                {log.user_name || '-'}
                {log.user_role && <><br /><small>{log.user_role}</small></>}
              </td>
              <td>
                <span className={'pill audit ' + (ACTION_CLASS[log.action] || '')}>{log.action}</span>
              </td>
              <td>{log.details}</td>
              <td><small>{log.ip_address}</small></td>
            </tr>
          ))}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>&larr; Prev</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next &rarr;</button>
        </div>
      )}
    </div>
  );
}

export default AuditTrail;
