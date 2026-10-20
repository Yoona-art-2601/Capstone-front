import { useState, useEffect } from 'react';
import './App.css';
import { productIcon } from './store';
import { PageShell } from './Layout';

const API = 'http://localhost/beaconmart-project/backend';

function statusLabel(order) {
  if (order.status === 'Cancelled') return { text: 'Cancelled', cls: 'cancelled' };
  if (order.status === 'Awaiting Payment') return { text: 'Awaiting Payment', cls: 'unpaid' };
  return { text: order.status, cls: order.status.toLowerCase() };
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState('');
  const [placedId] = useState(() => new URLSearchParams(window.location.search).get('placed'));

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
    <PageShell>
      <div className="my-orders">
        <h1>My Orders</h1>
        {placedId && (
          <div className="notice-bar success">
            <span>Order #{placedId} has been placed. You can follow its progress below.</span>
          </div>
        )}

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
              <div className="order-meta">
                {order.delivery_type === 'Pickup' ? 'Self pickup' : 'Home delivery'}
                {' · '}
                {{ Stripe: 'Paid online', COD: 'Cash on delivery', PayAtStore: 'Pay at store' }[order.payment_method] || order.payment_method}
                {order.slot_date && <> · {order.slot_date} {order.slot_time}</>}
              </div>
              <table className="order-items">
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{productIcon(item)} {item.name} &times; {item.quantity}</td>
                      <td className="num">RM {Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                  {Number(order.sst_amount) > 0 && (
                    <tr className="order-sub">
                      <td>SST</td>
                      <td className="num">RM {Number(order.sst_amount).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="order-sub">
                    <td>{order.delivery_type === 'Pickup' ? 'Self pickup' : 'Delivery'}{order.distance_km ? ' (' + Number(order.distance_km).toFixed(1) + ' km)' : ''}</td>
                    <td className="num">
                      {Number(order.delivery_fee) > 0 ? 'RM ' + Number(order.delivery_fee).toFixed(2) : 'FREE'}
                    </td>
                  </tr>
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
    </PageShell>
  );
}

export default MyOrders;
