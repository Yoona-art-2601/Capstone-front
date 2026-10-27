import { useState, useEffect, useCallback } from 'react';
import { API, postJSON } from './api';
import { formatDateTime } from './format';

function localNow(offsetHours = 0) {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>&larr; Prev</button>
      <span>Page {page} of {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>Next &rarr;</button>
    </div>
  );
}

function Warehouse({ branches, onChange }) {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [receiptPage, setReceiptPage] = useState(1);
  const [dispatchPage, setDispatchPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [inForm, setInForm] = useState({ product_id: '', quantity: '', supplier: '', reference: '', received_at: localNow() });
  const [outForm, setOutForm] = useState({ product_id: '', branch_id: '', quantity: '', expected_arrival: localNow(24), note: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({ receipt_page: receiptPage, dispatch_page: dispatchPage });
    if (statusFilter) params.set('status', statusFilter);
    fetch(API + '/warehouse/get_warehouse.php?' + params, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result);
        else setMessage('Error: ' + result.message);
      })
      .catch(() => setMessage('Could not load the warehouse.'));
  }, [receiptPage, dispatchPage, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (path, body, reset) => {
    setBusy(true);
    try {
      const result = await postJSON(path, body);
      setMessage(result.success ? result.message : 'Error: ' + result.message);
      if (result.success) {
        if (reset) reset();
        load();
        if (onChange) onChange();
      }
    } catch (err) {
      setMessage('Could not connect to the server.');
    }
    setBusy(false);
  };

  const receiveFromFactory = (e) => {
    e.preventDefault();
    run('/warehouse/receive_from_factory.php', inForm,
      () => setInForm({ product_id: '', quantity: '', supplier: inForm.supplier, reference: '', received_at: localNow() }));
  };

  const dispatchToBranch = (e) => {
    e.preventDefault();
    run('/warehouse/dispatch_to_branch.php', outForm,
      () => setOutForm({ ...outForm, product_id: '', quantity: '', note: '', expected_arrival: localNow(24) }));
  };

  const updateDispatch = (d, action) => {
    const text = action === 'receive'
      ? 'Confirm that ' + d.branch_name + ' received ' + d.quantity + ' x ' + d.product_name + '? Branch stock will increase.'
      : 'Cancel shipment #' + d.dispatch_id + '? The stock goes back to the warehouse.';
    if (!window.confirm(text)) return;
    run('/warehouse/update_dispatch.php', { dispatch_id: d.dispatch_id, action });
  };

  if (!data) return <p>{message || 'Loading warehouse...'}</p>;

  const stock = data.stock;
  const selectedOut = stock.find(p => String(p.product_id) === String(outForm.product_id));
  const totalUnits = stock.reduce((sum, p) => sum + Number(p.stock), 0);
  const totalTransit = stock.reduce((sum, p) => sum + Number(p.in_transit), 0);

  return (
    <div>
      <div className="cards">
        <div className="card">
          <div className="label">{data.warehouse.name}</div>
          <div className="value">{totalUnits}</div>
          <div className="sub">units in the warehouse</div>
        </div>
        <div className="card">
          <div className="label">In transit to branches</div>
          <div className="value">{totalTransit}</div>
          <div className="sub">units on the way</div>
        </div>
        <div className="card">
          <div className="label">Factory receipts</div>
          <div className="value">{data.receipts.total}</div>
          <div className="sub">deliveries recorded</div>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="wh-forms">
        <form className="form-box" onSubmit={receiveFromFactory}>
          <h3>Receive from factory</h3>
          <div className="form-grid">
            <label>Product
              <select value={inForm.product_id} onChange={(e) => setInForm({ ...inForm, product_id: e.target.value })} required>
                <option value="">Select product</option>
                {stock.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
              </select>
            </label>
            <label>Quantity
              <input type="number" min="1" className="narrow" value={inForm.quantity} onChange={(e) => setInForm({ ...inForm, quantity: e.target.value })} required />
            </label>
            <label>Factory / supplier
              <input value={inForm.supplier} onChange={(e) => setInForm({ ...inForm, supplier: e.target.value })} placeholder="e.g. Beacon Farm" required />
            </label>
            <label>Batch / invoice no.
              <input value={inForm.reference} onChange={(e) => setInForm({ ...inForm, reference: e.target.value })} placeholder="Optional" />
            </label>
            <label>Arrived at
              <input type="datetime-local" value={inForm.received_at} onChange={(e) => setInForm({ ...inForm, received_at: e.target.value })} />
            </label>
          </div>
          <button type="submit" disabled={busy}>Add to warehouse</button>
        </form>

        <form className="form-box" onSubmit={dispatchToBranch}>
          <h3>Ship to branch</h3>
          <div className="form-grid">
            <label>Product
              <select value={outForm.product_id} onChange={(e) => setOutForm({ ...outForm, product_id: e.target.value })} required>
                <option value="">Select product</option>
                {stock.map(p => <option key={p.product_id} value={p.product_id}>{p.name} ({p.stock} in warehouse)</option>)}
              </select>
            </label>
            <label>Branch
              <select value={outForm.branch_id} onChange={(e) => setOutForm({ ...outForm, branch_id: e.target.value })} required>
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
              </select>
            </label>
            <label>Quantity
              <input type="number" min="1" max={selectedOut ? selectedOut.stock : undefined} className="narrow"
                value={outForm.quantity} onChange={(e) => setOutForm({ ...outForm, quantity: e.target.value })} required />
            </label>
            <label>Expected arrival
              <input type="datetime-local" value={outForm.expected_arrival} onChange={(e) => setOutForm({ ...outForm, expected_arrival: e.target.value })} />
            </label>
            <label>Note
              <input value={outForm.note} onChange={(e) => setOutForm({ ...outForm, note: e.target.value })} placeholder="Optional, e.g. lorry no." />
            </label>
          </div>
          <button type="submit" disabled={busy}>Create shipment</button>
        </form>
      </div>

      <h3 className="wh-title">Shipments to branches</h3>
      <div className="toolbar">
        <label>Status:{' '}
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setDispatchPage(1); }}>
            <option value="">All</option>
            <option>In Transit</option>
            <option>Received</option>
            <option>Cancelled</option>
          </select>
        </label>
        <span>{data.dispatches.total} shipment(s)</span>
        <button onClick={load}>Refresh</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>To branch</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Shipped</th>
            <th>Expected</th>
            <th>Received</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.dispatches.data.length === 0 && <tr><td colSpan="9">No shipments yet.</td></tr>}
          {data.dispatches.data.map(d => (
            <tr key={d.dispatch_id}>
              <td>{d.dispatch_id}</td>
              <td>{d.product_name}{d.note && <><br /><small>{d.note}</small></>}</td>
              <td>{d.branch_name}</td>
              <td>{d.quantity}</td>
              <td>
                <span className={'pill ' + (d.status === 'Received' ? 'paid' : d.status === 'Cancelled' ? 'cancelled' : 'unpaid')}>{d.status}</span>
              </td>
              <td className="nowrap">{formatDateTime(d.dispatched_at)}<br /><small>{d.dispatched_by}</small></td>
              <td className="nowrap">{d.expected_arrival ? formatDateTime(d.expected_arrival) : '-'}</td>
              <td className="nowrap">{d.status === 'Received' ? <>{formatDateTime(d.received_at)}<br /><small>{d.received_by}</small></> : '-'}</td>
              <td className="nowrap">
                {d.status === 'In Transit' ? (
                  <>
                    <button onClick={() => updateDispatch(d, 'receive')} disabled={busy}>Mark received</button>{' '}
                    <button className="danger" onClick={() => updateDispatch(d, 'cancel')} disabled={busy}>Cancel</button>
                  </>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={data.dispatches.page} pages={data.dispatches.pages} onChange={setDispatchPage} />

      <h3 className="wh-title">Warehouse stock</h3>
      <table className="admin-table">
        <thead>
          <tr><th>Product</th><th>Category</th><th>In warehouse</th><th>In transit</th></tr>
        </thead>
        <tbody>
          {stock.map(p => (
            <tr key={p.product_id}>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>{p.stock}{Number(p.stock) === 0 && <> <span className="pill cancelled">Empty</span></>}</td>
              <td>{Number(p.in_transit) > 0 ? p.in_transit : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="wh-title">Factory receipts</h3>
      <table className="admin-table">
        <thead>
          <tr><th>#</th><th>Product</th><th>Qty</th><th>Factory / supplier</th><th>Reference</th><th>Arrived</th><th>Recorded by</th></tr>
        </thead>
        <tbody>
          {data.receipts.data.length === 0 && <tr><td colSpan="7">No factory deliveries recorded yet.</td></tr>}
          {data.receipts.data.map(r => (
            <tr key={r.receipt_id}>
              <td>{r.receipt_id}</td>
              <td>{r.product_name}</td>
              <td>{r.quantity}</td>
              <td>{r.supplier}</td>
              <td>{r.reference || '-'}</td>
              <td className="nowrap">{formatDateTime(r.received_at)}</td>
              <td>{r.received_by}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={data.receipts.page} pages={data.receipts.pages} onChange={setReceiptPage} />
    </div>
  );
}

export default Warehouse;
