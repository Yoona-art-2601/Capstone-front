import { useState, useEffect, useCallback } from 'react';
import { API, postJSON } from './api';
import { formatDateTime } from './format';

const STATUSES = ['In Transit', 'Received', 'Cancelled'];

function Incoming({ branchId, onChange }) {
  const [status, setStatus] = useState('In Transit');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ status, page });
    if (branchId !== 'all') params.set('branch_id', branchId);
    fetch(API + '/warehouse/incoming.php?' + params, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result);
        else setMessage('Error: ' + result.message);
      })
      .catch(() => setMessage('Could not load incoming stock.'));
  }, [branchId, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [branchId, status]);

  const update = async (d, action) => {
    const text = action === 'receive'
      ? 'Confirm that ' + d.quantity + ' x ' + d.product_name + ' arrived at ' + d.branch_name + '? Branch stock will increase.'
      : 'Cancel shipment #' + d.dispatch_id + '? The stock goes back to the warehouse.';
    if (!window.confirm(text)) return;
    setBusy(d.dispatch_id);
    try {
      const result = await postJSON('/warehouse/update_dispatch.php', { dispatch_id: d.dispatch_id, action });
      setMessage(result.success ? result.message + '.' : 'Error: ' + result.message);
      if (result.success) {
        load();
        if (onChange) onChange();
      }
    } catch (err) {
      setMessage('Could not connect to the server.');
    }
    setBusy(null);
  };

  const counts = (data && data.counts) || {};

  return (
    <div>
      <p className="hint-line">
        Stock shipped from the central warehouse to {branchId === 'all' ? 'the branches' : 'this branch'}. When the delivery
        arrives, check the quantity and press Mark received: the branch stock goes up and the shipment is closed.
      </p>
      <div className="status-chips">
        {STATUSES.map(s => (
          <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
            {s} <span>{counts[s] || 0}</span>
          </button>
        ))}
      </div>
      {message && <div className="notice">{message}</div>}

      {data && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th><th>Product</th><th>To branch</th><th>Qty</th><th>Shipped</th>
                <th>Expected</th><th>{status === 'In Transit' ? 'Action' : 'Closed'}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 && <tr><td colSpan="7">{status === 'In Transit' ? 'Nothing on the way.' : 'No shipments.'}</td></tr>}
              {data.data.map(d => (
                <tr key={d.dispatch_id} className={Number(d.overdue) ? 'low-row' : ''}>
                  <td>{d.dispatch_id}</td>
                  <td>{d.product_name}<br /><small>{d.category}{d.note ? ' · ' + d.note : ''}</small></td>
                  <td>{d.branch_name}</td>
                  <td>{d.quantity}</td>
                  <td className="nowrap">{formatDateTime(d.dispatched_at)}<br /><small>{d.dispatched_by}</small></td>
                  <td className="nowrap">
                    {d.expected_arrival ? formatDateTime(d.expected_arrival) : '-'}
                    {Number(d.overdue) === 1 && <><br /><span className="pill cancelled">Late</span></>}
                  </td>
                  <td className="nowrap">
                    {d.status === 'In Transit' ? (
                      <>
                        <button onClick={() => update(d, 'receive')} disabled={busy === d.dispatch_id}>Mark received</button>{' '}
                        {data.can_cancel && <button className="danger" onClick={() => update(d, 'cancel')} disabled={busy === d.dispatch_id}>Cancel</button>}
                      </>
                    ) : (
                      <>{d.received_at ? formatDateTime(d.received_at) : '-'}<br /><small>{d.received_by}</small></>
                    )}
                  </td>
                </tr>
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

export default Incoming;
