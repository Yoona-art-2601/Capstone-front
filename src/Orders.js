import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost/beaconmart-project/backend';
const STATUS_OPTIONS = ['Pending', 'Processing', 'Completed', 'Cancelled'];

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
      const ok = window.confirm(
        'Cancel order #' + order.order_id + '? Stock will be returned to the branch. This cannot be undone.'
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
            ? 'Order #' + order.order_id + ' updated to ' + newStatus + '.'
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
    order.status !== 'Cancelled' && order.status !== 'Awaiting Payment';

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
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan="8">No orders found.</td></tr>
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
                  <span className={'pill ' + (order.payment_status === 'Paid' ? 'paid' : 'unpaid')}>
                    {order.payment_status}
                  </span>
                </td>
                <td>
                  {isEditable(order) ? (
                    <select
                      value={order.status}
                      onChange={(e) => changeStatus(order, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={'pill ' + (order.status === 'Cancelled' ? 'cancelled' : 'unpaid')}>
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