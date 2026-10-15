import { useState, useEffect } from 'react';
import './App.css';
import { PageShell } from './Layout';

const API = 'http://localhost/beaconmart-project/backend';

const rm = (value) => 'RM ' + Number(value).toFixed(2);

function statusLabel(order) {
  if (order.status === 'Cancelled') return { text: 'Cancelled', cls: 'cancelled' };
  if (order.payment_status !== 'Paid') return { text: 'Awaiting payment', cls: 'unpaid' };
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
      .catch(() => setError('Cannot connect to the server.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <h1 className="page-title" data-reveal>My orders</h1>

      {loading && <p className="page-lead">Loading your orders…</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !loggedIn && (
        <p className="page-lead">Log in on the <a href="/">shop page</a> to see your orders.</p>
      )}
      {!loading && loggedIn && !error && orders.length === 0 && (
        <p className="page-lead">No orders yet. <a href="/">The shelves are this way.</a></p>
      )}

      <div className="order-list">
        {orders.map(order => {
          const status = statusLabel(order);
          return (
            <article key={order.order_id} className="order" data-reveal>
              <div className="order-head">
                <h2>Order {order.order_id}</h2>
                <span className={'order-status ' + status.cls}>{status.text}</span>
              </div>
              <p className="order-meta">Placed {order.order_date} at {order.branch_name || 'an unassigned branch'}.</p>
              <table className="order-lines">
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name} × {item.quantity}</td>
                      <td>{rm(item.subtotal)}</td>
                    </tr>
                  ))}
                  <tr className="order-sub">
                    <td>Delivery</td>
                    <td>{Number(order.delivery_fee) > 0 ? rm(order.delivery_fee) : 'Free'}</td>
                  </tr>
                  <tr className="order-total">
                    <td>Total</td>
                    <td>{rm(order.total_amount)}</td>
                  </tr>
                </tbody>
              </table>
              {order.customer_address && (
                <p className="order-delivery">
                  Delivering to {order.customer_name}, {order.customer_phone}, {order.customer_address}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}

export default MyOrders;
