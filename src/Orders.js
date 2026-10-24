import { useState, useEffect, useCallback } from 'react';
import { API } from './api';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Out for Delivery', 'Ready for Pickup', 'Completed', 'Cancelled'];
const PAYMENT_LABELS = { Stripe: 'Online (Stripe)', COD: 'Cash on delivery', PayAtStore: 'Pay at store' };

function nextStatuses(order) {
  const steps = order.steps || ['Pending', 'Processing', 'Out for Delivery', 'Completed'];
  const index = steps.indexOf(order.status);
  return [order.status, ...(index === -1 ? [] : steps.slice(index + 1)), 'Cancelled'];
}

function Orders({ branchId }) {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(() => {
    const query = branchId === 'all' ? '' : '?branch_id=' + branchId;
    setLoading(true);
    fetch(API + '/orders/get_orders.php' + query, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setOrders(result.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setMessage('Could not load orders.');
        setLoading(false);
      });
  }, [branchId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  const shown = statusFilter === 'All'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const isEditable = (order) =>
    !['Cancelled', 'Completed', 'Awaiting Payment'].includes(order.status);

  return (
    <div>
      <div className="toolbar">
        <label>
          Status:{' '}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="Awaiting Payment">Awaiting Payment</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <span>{shown.length} order(s)</span>
        <button onClick={loadOrders}>Refresh</button>
      </div>

      {message && <div className="notice">{message}</div>}

      {loading ? (
        <p>Loading orders...</p>
      ) : (
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
            {shown.length === 0 && (
              <tr><td colSpan="9">No orders found.</td></tr>
            )}
            {shown.map(order => (
              <tr key={order.order_id}>
                <td>#{order.order_id}</td>
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
                  {order.slot_date && <><br /><small>{order.slot_date} {order.slot_time}</small></>}
                </td>
                <td>
                  <span className={'pill ' + (order.payment_status === 'Paid' ? 'paid' : order.payment_status === 'Refunded' ? 'cancelled' : 'unpaid')}>
                    {order.payment_status}
                  </span>
                  <br />
                  <small>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</small>
                </td>
                <td>
                  {isEditable(order) ? (
                    <select
                      value={order.status}
                      onChange={(e) => changeStatus(order, e.target.value)}
                    >
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
                <td>{order.order_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Orders;