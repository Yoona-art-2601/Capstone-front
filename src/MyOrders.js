import { useState, useEffect } from 'react';
import './App.css';
import { productIcon } from './store';

const API = 'http://localhost/beaconmart-project/backend';

function statusLabel(order) {
  if (order.status === 'Cancelled') return { text: 'Cancelled', cls: 'cancelled' };
  if (order.payment_status !== 'Paid') return { text: 'Awaiting Payment', cls: 'unpaid' };
  return { text: order.status, cls: order.status.toLowerCase() };
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(API + '/orders/my_orders.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setOrders(result.data);
        } else if (result.message === 'Please login first') {
          setLoggedIn(false);
        } else {
          setError(result.message);
        }
      })
      .catch(() => setError('Cannot connect to server.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="my-orders-page">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark">🌿</span>
          <span>
            <span className="brand-name">Beacon Mart</span>
            <span className="brand-tag">Natural &amp; Healthy Food</span>
          </span>
        </a>
        <div className="topbar-actions">
          <a href="/" className="btn btn-ghost">&larr; Back to store</a>
        </div>
      </header>

      <div className="my-orders">
        <h1>My Orders</h1>

        {loading && <p className="message">Loading...</p>}
        {error && <p className="auth-error">{error}</p>}
        {!loading && !loggedIn && (
          <p className="message">Please <a href="/">login on the store page</a> to see your orders.</p>
        )}
        {!loading && loggedIn && !error && orders.length === 0 && (
          <p className="message">You have no orders yet. <a href="/">Start shopping</a></p>
        )}

        {orders.map(order => {
          const status = statusLabel(order);
          return (
            <div key={order.order_id} className="order-card">
              <div className="order-card-head">
                <strong>Order #{order.order_id}</strong>
                <span className={'order-status ' + status.cls}>{status.text}</span>
              </div>
              <div className="order-meta">
                {order.order_date} &middot; 📍 {order.branch_name || '-'}
              </div>
              <table className="order-items">
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{productIcon(item)} {item.name} &times; {item.quantity}</td>
                      <td className="num">RM {Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="order-total">
                    <td>Total</td>
                    <td className="num">RM {Number(order.total_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              {order.customer_address && (
                <div className="order-delivery">
                  🚚 <strong>{order.customer_name}</strong>, {order.customer_phone}<br />
                  {order.customer_address}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyOrders;
