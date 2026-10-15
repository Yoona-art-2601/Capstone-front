import { useState, useEffect, useRef } from 'react';
import './App.css';
import { PageShell, useShopSettings } from './Layout';
import CustomerAuth from './CustomerAuth';
import { productImageUrl } from './ProductModal';
import { productIcon, withPricing } from './store';
import { loadSavedBranch, loadSavedCart, saveCart, rebuildCart, isValidPhone } from './cartStorage';

const API = 'http://localhost/beaconmart-project/backend';

const rm = (value) => 'RM ' + Number(value).toFixed(2);

function CartPage() {
  const branchId = useRef(loadSavedBranch() || 1).current;
  const settings = useShopSettings();
  const [branchName, setBranchName] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    fetch(API + '/products/get_products.php?branch_id=' + branchId)
      .then(res => res.json())
      .then(result => {
        if (result.success) setCart(rebuildCart(loadSavedCart(branchId), result.data.map(withPricing)));
      })
      .catch(() => setError('Could not load your cart. Please refresh the page.'))
      .finally(() => {
        hydrated.current = true;
        setLoading(false);
      });

    fetch(API + '/branches/get_branches.php')
      .then(res => res.json())
      .then(result => {
        const branch = result.success && result.data.find(b => b.branch_id === branchId);
        if (branch) setBranchName(branch.branch_name);
      })
      .catch(() => {});

    fetch(API + '/auth/me.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setUser(result.user);
          setCustomerName(name => name || result.user.name);
        }
      })
      .catch(() => {});
  }, [branchId]);

  useEffect(() => {
    if (hydrated.current) saveCart(branchId, cart);
  }, [cart, branchId]);

  const changeQty = (productId, delta) => {
    setCart(cart
      .map(item => {
        if (item.product_id !== productId) return item;
        return { ...item, quantity: Math.min(item.quantity + delta, item.stock) };
      })
      .filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const deliveryFee = !settings || subtotal >= settings.free_delivery_threshold ? 0 : settings.delivery_fee;
  const amountToFree = settings ? settings.free_delivery_threshold - subtotal : 0;
  const total = subtotal + deliveryFee;

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setCustomerName(name => name || loggedInUser.name);
    setShowAuth(false);
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    setError('');
    if (!customerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!isValidPhone(customerPhone)) {
      setError('Please enter a valid phone number, for example 012-345 6789.');
      return;
    }
    if (customerAddress.trim().length < 10) {
      setError('Please enter your full delivery address.');
      return;
    }
    if (cart.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    fetch(API + '/payment/create_checkout_session.php', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id: branchId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
      })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          window.location.href = result.checkout_url;
        } else {
          setError(result.message);
          setSubmitting(false);
        }
      })
      .catch(() => {
        setError('Could not connect to the server.');
        setSubmitting(false);
      });
  };

  return (
    <PageShell>
      {showAuth && <CustomerAuth onLogin={handleLogin} onClose={() => setShowAuth(false)} />}

      <div className="cart-page-head">
        <div>
          <h1>Your Cart</h1>
          {branchName && <p className="page-lead">Packed and delivered by {branchName}</p>}
        </div>
        <a href="/" className="btn btn-ghost">&larr; Continue shopping</a>
      </div>

      {loading ? (
        <p className="message">Loading your cart...</p>
      ) : cart.length === 0 ? (
        <div className="message cart-page-empty">
          <p>Your cart is empty.</p>
          <a href="/" className="btn btn-primary">Start shopping</a>
        </div>
      ) : (
        <div className="cart-page">
          <section className="cart-page-items">
            <h2>{cartCount} item{cartCount === 1 ? '' : 's'}</h2>
            <ul className="cart-items">
              {cart.map(item => (
                <li key={item.product_id}>
                  <span className="cart-icon cart-icon-lg">
                    {productImageUrl(item) ? <img src={productImageUrl(item)} alt="" /> : productIcon(item)}
                  </span>
                  <div className="cart-item-info">
                    <strong>{item.name}</strong>
                    <small>
                      {rm(item.unit_price)} each
                      {item.on_sale && <> <s>{rm(item.price)}</s></>}
                    </small>
                    <div className="qty">
                      <button onClick={() => changeQty(item.product_id, -1)} aria-label="Decrease">−</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item.product_id, 1)}
                        disabled={item.quantity >= item.stock}
                        aria-label="Increase"
                      >+</button>
                    </div>
                  </div>
                  <div className="cart-item-right">
                    <strong>{rm(item.quantity * item.unit_price)}</strong>
                    <button className="link-button" onClick={() => removeFromCart(item.product_id)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="cart-page-side">
            <div className="cart-panel cart-page-summary">
              <h2>Order Summary</h2>
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{rm(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  {deliveryFee === 0 ? <span className="free">FREE</span> : <span>{rm(deliveryFee)}</span>}
                </div>
                {settings && amountToFree > 0 && (
                  <div className="free-progress">
                    <span>Add <strong>{rm(amountToFree)}</strong> more for FREE delivery</span>
                    <div className="bar">
                      <div style={{ width: Math.min(100, (subtotal / settings.free_delivery_threshold) * 100) + '%' }} />
                    </div>
                  </div>
                )}
                {settings && amountToFree <= 0 && (
                  <div className="free-progress done">You've unlocked FREE delivery!</div>
                )}
              </div>
              <div className="cart-total">
                <span>Total</span>
                <strong>{rm(total)}</strong>
              </div>
            </div>

            <form className="cart-panel checkout-form" onSubmit={handleCheckout} noValidate>
              <h3>Delivery details</h3>
              {!user && (
                <p className="login-hint">
                  <button type="button" className="link-button" onClick={() => setShowAuth(true)}>Login</button>
                  {' '}to track this order in My Orders, or continue as guest.
                </p>
              )}
              {error && <div className="auth-error">{error}</div>}
              <label>
                Full name
                <input type="text" autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </label>
              <label>
                Phone number
                <input
                  type="tel" autoComplete="tel" placeholder="e.g. 012-345 6789" value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </label>
              <label>
                Delivery address
                <textarea
                  rows={3} autoComplete="street-address" placeholder="Street, postcode, city" value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Redirecting to payment...' : 'Pay ' + rm(total)}
              </button>
              <small className="secure-note">🔒 Secure payment by Stripe</small>
            </form>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

export default CartPage;
