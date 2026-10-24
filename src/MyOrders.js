import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { productIcon } from './store';
import { PageShell } from './Layout';
import { Stars, StarInput } from './Stars';
import { clearSavedCart } from './cartStorage';
import { API } from './api';

const PAYMENT_LABELS = { Stripe: 'Online payment', COD: 'Cash on delivery', PayAtStore: 'Pay at store' };

function stepLabel(status, deliveryType) {
  if (status === 'Completed') return deliveryType === 'Pickup' ? 'Picked up' : 'Delivered';
  if (status === 'Pending') return 'Order placed';
  return status;
}

function statusLabel(order) {
  if (order.status === 'Cancelled') return { text: 'Cancelled', cls: 'cancelled' };
  if (order.status === 'Awaiting Payment') return { text: 'Awaiting Payment', cls: 'unpaid' };
  return { text: stepLabel(order.status, order.delivery_type), cls: order.status.toLowerCase().replace(/\s+/g, '-') };
}

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value.replace(' ', 'T'));
  return d.toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function OrderTimeline({ order }) {
  const steps = order.steps || ['Pending', 'Processing', 'Out for Delivery', 'Completed'];
  const history = order.history || [];
  const reachedAt = {};
  history.forEach(h => { reachedAt[h.status] = h.changed_at; });
  const currentIndex = steps.indexOf(order.status);

  if (order.status === 'Cancelled') {
    const cancel = [...history].reverse().find(h => h.status === 'Cancelled');
    return (
      <div className="timeline-cancelled">
        Cancelled {cancel ? formatTime(cancel.changed_at) : ''}{cancel && cancel.note ? ' · ' + cancel.note : ''}
      </div>
    );
  }
  if (order.status === 'Awaiting Payment') {
    return <div className="timeline-cancelled waiting">Waiting for online payment to be completed.</div>;
  }

  return (
    <ol className="timeline">
      {steps.map((step, i) => {
        const state = i < currentIndex || order.status === 'Completed' ? 'done' : i === currentIndex ? 'current' : 'todo';
        return (
          <li key={step} className={'timeline-step ' + state}>
            <span className="timeline-dot">{state === 'todo' ? i + 1 : '✓'}</span>
            <span className="timeline-label">{stepLabel(step, order.delivery_type)}</span>
            <small>{reachedAt[step] ? formatTime(reachedAt[step]) : ''}</small>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewItem({ order, item, onSaved }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (item.my_rating) {
    return (
      <li className="review-item">
        <span className="review-item-name">{item.name}</span>
        <span className="review-done">
          <Stars value={item.my_rating} /> Reviewed
          {item.my_comment && <small>“{item.my_comment}”</small>}
        </span>
      </li>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please choose a star rating.');
      return;
    }
    setSaving(true);
    fetch(API + '/reviews/add_review.php', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.order_id, product_id: item.product_id, rating, comment })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          onSaved();
        } else {
          setError(result.message);
          setSaving(false);
        }
      })
      .catch(() => {
        setError('Cannot connect to server.');
        setSaving(false);
      });
  };

  return (
    <li className="review-item">
      <span className="review-item-name">{item.name}</span>
      {!open ? (
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Rate</button>
      ) : (
        <form className="review-form" onSubmit={submit}>
          <StarInput value={rating} onChange={(n) => { setRating(n); setError(''); }} />
          <textarea
            rows={2} maxLength={1000} placeholder="What did you think? (optional)"
            value={comment} onChange={(e) => setComment(e.target.value)}
          />
          {error && <div className="auth-error">{error}</div>}
          <div className="review-form-actions">
            <button type="button" className="link-button" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving...' : 'Submit review'}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('placed')) {
      return { type: 'success', text: 'Order #' + params.get('placed') + ' has been placed. You can follow its progress below.' };
    }
    if (params.get('refunded')) {
      return { type: 'error', text: 'Order #' + params.get('refunded') + ' could not be completed because an item sold out. Your payment has been refunded.' };
    }
    if (params.get('payment') === 'pending') {
      return { type: 'info', text: 'We have not received your payment yet. You can continue paying from the order below.' };
    }
    if (params.get('payment') === 'error') {
      return { type: 'error', text: 'We could not confirm your payment. Please check your order below or contact the store.' };
    }
    return null;
  });
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('placed')) clearSavedCart();
    if ([...params.keys()].length) window.history.replaceState({}, '', '/my-orders');
  }, []);

  const loadOrders = useCallback(() => {
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

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const cancelOrder = (order) => {
    if (!window.confirm('Cancel order #' + order.order_id + '?')) return;
    fetch(API + '/orders/cancel_my_order.php', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.order_id })
    })
      .then(res => res.json())
      .then(result => {
        setError(result.success ? '' : result.message);
        setNotice(result.success ? { type: 'success', text: 'Order #' + order.order_id + ' has been cancelled.' } : null);
        loadOrders();
      })
      .catch(() => setError('Cannot connect to server.'));
  };

  const payNow = (order) => {
    setPaying(order.order_id);
    setError('');
    fetch(API + '/payment/resume_payment.php', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.order_id })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.checkout_url) {
          window.location.href = result.checkout_url;
          return;
        }
        setPaying(null);
        setNotice({ type: 'info', text: result.message });
        loadOrders();
      })
      .catch(() => {
        setPaying(null);
        setError('Cannot connect to server.');
      });
  };

  const canPay = (order) =>
    order.status === 'Awaiting Payment' && order.payment_method === 'Stripe' && order.payment_status === 'Unpaid';

  const canCancel = (order) =>
    ['Awaiting Payment', 'Pending'].includes(order.status) && order.payment_status !== 'Paid';

  return (
    <PageShell>
      <div className="my-orders">
        <h1>My Orders</h1>
        {notice && (
          <div className={'notice-bar ' + notice.type}>
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
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
                {order.payment_status === 'Refunded'
                  ? 'Refunded'
                  : order.payment_status === 'Paid'
                    ? (order.payment_method === 'Stripe' ? 'Paid online' : 'Paid')
                    : PAYMENT_LABELS[order.payment_method] || order.payment_method}
                {order.slot_date && <> · {order.delivery_type === 'Pickup' ? 'Pickup' : 'Delivery'} {order.slot_date} {order.slot_time}</>}
              </div>

              <OrderTimeline order={order} />

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
              {order.status === 'Completed' && (
                <div className="review-section">
                  <h3>Rate your items</h3>
                  <ul>
                    {order.items.map(item => (
                      <ReviewItem key={item.product_id} order={order} item={item} onSaved={loadOrders} />
                    ))}
                  </ul>
                </div>
              )}
              {(canPay(order) || canCancel(order)) && (
                <div className="order-actions">
                  {canPay(order) && order.pay_before && (
                    <span className="pay-before">Pay before {formatTime(order.pay_before)}</span>
                  )}
                  {canCancel(order) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => cancelOrder(order)}>Cancel order</button>
                  )}
                  {canPay(order) && (
                    <button className="btn btn-primary btn-sm" onClick={() => payNow(order)} disabled={paying === order.order_id}>
                      {paying === order.order_id ? 'Opening payment...' : 'Pay now'}
                    </button>
                  )}
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
