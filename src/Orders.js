import { useState, useEffect, useCallback } from 'react';
import { API } from './api';
import { formatDateTime, formatSlot } from './format';

const STATUS_FILTERS = ['Open', 'Awaiting Payment', 'Pending', 'Processing', 'Out for Delivery', 'Ready for Pickup', 'Completed', 'Cancelled'];
const PAYMENT_LABELS = { Stripe: 'Online (Stripe)', COD: 'Cash on delivery', PayAtStore: 'Pay at store' };
const OPEN_STATUSES = ['Pending', 'Processing', 'Out for Delivery', 'Ready for Pickup'];

function nextStatuses(order) {
  const steps = order.steps || ['Pending', 'Processing', 'Out for Delivery', 'Completed'];
  const index = steps.indexOf(order.status);
  return [order.status, ...(index === -1 ? [] : steps.slice(index + 1)), 'Cancelled'];
}

function OrderRow({ order, open, onToggle, onChangeStatus }) {
  const isEditable = !['Cancelled', 'Completed', 'Awaiting Payment'].includes(order.status);
  return (
    <>
      <tr>
        <td>
          <button className="link-like" onClick={onToggle} aria-expanded={open} title="Show status history">
            #{order.order_id} {open ? '▾' : '▸'}
          </button>
        </td>
        <td>
          {order.customer_name}
          <br />
          <small>{order.customer_phone}</small>
          {order.customer_address && (
            <>
              <br />
              <small className="address">{order.customer_address}</small>
            </>
          )}
        </td>
        <td>{order.branch_name || '-'}</td>
        <td>
          {order.items.map(item => (
            <div key={item.product_id}>{item.name} × {item.quantity}</div>
          ))}
        </td>
        <td>{Number(order.total_amount).toFixed(2)}</td>
        <td>
          {order.delivery_type === 'Pickup' ? 'Self pickup' : 'Delivery'}
          {order.distance_km && <small> ({Number(order.distance_km).toFixed(1)} km)</small>}
          {order.slot_date && <><br /><small>{formatSlot(order.slot_date, order.slot_time)}</small></>}
        </td>
        <td>
          <span className={'pill ' + (order.payment_status === 'Paid' ? 'paid' : order.payment_status === 'Refunded' ? 'cancelled' : 'unpaid')}>
            {order.payment_status}
          </span>
          <br />
          <small>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</small>
        </td>
        <td>
          {isEditable ? (
            <select value={order.status} onChange={(e) => onChangeStatus(order, e.target.value)}>
              {nextStatuses(order).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className={'pill ' + (order.status === 'Cancelled' ? 'cancelled' : order.status === 'Completed' ? 'paid' : 'unpaid')}>
              {order.status}
            </span>
          )}
        </td>
        <td className="nowrap">{formatDateTime(order.order_date)}</td>
      </tr>
      {open && (
        <tr className="details-row">
          <td colSpan="9">
            <strong>Status history</strong>
            <ol className="order-history">
              {(order.history || []).map((h, i) => (
                <li key={i}>
                  <span className="nowrap">{formatDateTime(h.changed_at)}</span>
                  <strong>{h.status}</strong>
                  {h.note && <span>{h.note}</span>}
                  {h.changed_by && <small>by {h.changed_by}</small>}
                </li>
              ))}
              {(!order.history || order.history.length === 0) && <li>No history recorded.</li>}
            </ol>
          </td>
        </tr>
      )}
    </>
  );
}

function Orders({ branchId }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Open');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const loadOrders = useCallback(() => {
    const params = new URLSearchParams({ page, status });
    if (branchId !== 'all') params.set('branch_id', branchId);
    if (search.trim()) params.set('search', search.trim());
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (deliveryType) params.set('delivery_type', deliveryType);
    setLoading(true);
    fetch(API + '/orders/get_orders.php?' + params, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result);
        else setMessage('Error: ' + result.message);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setMessage('Could not load orders.');
        setLoading(false);
      });
  }, [branchId, page, status, search, dateFrom, dateTo, deliveryType]);

  useEffect(() => {
    const timer = setTimeout(loadOrders, 250);
    return () => clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [branchId, status, search, dateFrom, dateTo, deliveryType]);

  const changeStatus = (order, newStatus) => {
    if (newStatus === order.status) return;

    if (newStatus === 'Cancelled') {
      const refund = order.payment_method === 'Stripe' && order.payment_status === 'Paid'
        ? ' The online payment of RM ' + Number(order.total_amount).toFixed(2) + ' will be refunded through Stripe.'
        : '';
      const ok = window.confirm(
        'Cancel order #' + order.order_id + '? Stock will be returned to the branch.' + refund + ' This cannot be undone.'
      );
      if (!ok) return;
    }

    fetch(API + '/orders/update_order_status.php', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.order_id, status: newStatus })
    })
      .then(res => res.json())
      .then(result => {
        setMessage(
          result.success
            ? 'Order #' + order.order_id + ': ' + (newStatus === 'Cancelled' ? result.message : 'updated to ' + newStatus) + '.'
            : 'Error: ' + result.message
        );
        loadOrders();
      })
      .catch(err => {
        console.error(err);
        setMessage('Could not connect to the server.');
      });
  };

  const counts = (data && data.counts) || {};
  const countOf = (s) => s === 'Open'
    ? OPEN_STATUSES.reduce((sum, k) => sum + (counts[k] || 0), 0)
    : s === 'All' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[s] || 0;
  const filtersActive = search || dateFrom || dateTo || deliveryType;

  return (
    <div>
      <div className="status-chips">
        {['All', ...STATUS_FILTERS].map(s => (
          <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
            {s === 'Open' ? 'To do' : s} <span>{countOf(s)}</span>
          </button>
        ))}
      </div>

      <div className="toolbar audit-toolbar">
        <input type="search" placeholder="Order #, customer name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label>From <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label>To <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} /></label>
        <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
          <option value="">Delivery and pickup</option>
          <option value="Delivery">Delivery only</option>
          <option value="Pickup">Pickup only</option>
        </select>
        {filtersActive && (
          <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setDeliveryType(''); }}>Clear filters</button>
        )}
        <span>{data ? data.total : 0} order(s)</span>
        <button onClick={loadOrders}>Refresh</button>
      </div>

      {message && <div className="notice">{message}</div>}

      {loading && !data ? (
        <p>Loading orders...</p>
      ) : data && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Items</th>
                <th>Total (RM)</th>
                <th>Fulfilment</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 && (
                <tr><td colSpan="9">No orders found.</td></tr>
              )}
              {data.data.map(order => (
                <OrderRow
                  key={order.order_id}
                  order={order}
                  open={openId === order.order_id}
                  onToggle={() => setOpenId(openId === order.order_id ? null : order.order_id)}
                  onChangeStatus={changeStatus}
                />
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

export default Orders;
