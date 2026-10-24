import { useState, useEffect, useRef } from 'react';
import './App.css';
import { PageShell, useShopSettings } from './Layout';
import CustomerAuth from './CustomerAuth';
import { productImageUrl } from './ProductModal';
import { productIcon, withPricing } from './store';
import { loadSavedBranch, loadSavedCart, saveCart, clearSavedCart, rebuildCart, isValidPhone } from './cartStorage';
import { API, rm, postJSON } from './api';

const PAYMENT_OPTIONS = {
  Delivery: [
    { value: 'Stripe', label: 'Pay online now', note: 'Card payment on Stripe' },
    { value: 'COD', label: 'Cash on delivery', note: 'Pay the rider when your order arrives' }
  ],
  Pickup: [
    { value: 'Stripe', label: 'Pay online now', note: 'Card payment on Stripe' },
    { value: 'PayAtStore', label: 'Pay at the store', note: 'Pay when you collect your order' }
  ]
};

function CartPage() {
  const branchId = useRef(loadSavedBranch() || 1).current;
  const settings = useShopSettings();
  const [branchName, setBranchName] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [deliveryType, setDeliveryType] = useState('Delivery');
  const [paymentMethod, setPaymentMethod] = useState('Stripe');
  const [form, setForm] = useState({ name: '', phone: '', street: '', city: '', state: 'Selangor', postcode: '' });
  const [saveDetails, setSaveDetails] = useState(true);
  const [slots, setSlots] = useState([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hydrated = useRef(false);

  const fillFromUser = (u) => {
    setForm(f => ({
      name: f.name || u.name || '',
      phone: f.phone || u.phone || '',
      street: f.street || u.street || '',
      city: f.city || u.city || '',
      state: u.state || f.state,
      postcode: f.postcode || u.postcode || ''
    }));
  };

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

    fetch(API + '/shop/get_slots.php?branch_id=' + branchId)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data.length) {
          setSlots(result.data);
          setSlotDate(result.data[0].date);
        }
      })
      .catch(() => {});

    fetch(API + '/auth/me.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setUser(result.user);
          fillFromUser(result.user);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingUser(false));
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

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const chooseDelivery = (type) => {
    setDeliveryType(type);
    setPaymentMethod('Stripe');
  };

  const addressReady = form.street.trim().length >= 5 && form.city.trim() !== '' && form.state !== '' && /^\d{5}$/.test(form.postcode);
  const itemsKey = cart.map(i => i.product_id + 'x' + i.quantity).join(',');

  useEffect(() => {
    const quoteItems = itemsKey === '' ? [] : itemsKey.split(',').map(pair => {
      const [productId, quantity] = pair.split('x');
      return { product_id: Number(productId), quantity: Number(quantity) };
    });
    if (!user || quoteItems.length === 0) {
      setQuote(null);
      return undefined;
    }
    if (deliveryType === 'Delivery' && !addressReady) {
      setQuote(null);
      setQuoteError('');
      return undefined;
    }
    const timer = setTimeout(() => {
      setQuoting(true);
      postJSON('/shop/quote.php', {
        branch_id: branchId,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        street: form.street,
        city: form.city,
        state: form.state,
        postcode: form.postcode,
        items: quoteItems
      })
        .then(result => {
          if (result.success) {
            setQuote(result.data);
            setQuoteError('');
          } else {
            setQuote(null);
            setQuoteError(result.message);
          }
        })
        .catch(() => setQuoteError('Could not calculate the delivery fee.'))
        .finally(() => setQuoting(false));
    }, 700);
    return () => clearTimeout(timer);
  }, [user, deliveryType, paymentMethod, form.street, form.city, form.state, form.postcode, addressReady, itemsKey, branchId]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const sstRate = settings ? settings.sst_rate : 0.06;
  const sst = Math.round(subtotal * sstRate * 100) / 100;
  const freeThreshold = settings ? settings.free_delivery_threshold : 120;
  const amountToFree = freeThreshold - subtotal;
  const total = quote ? quote.total : subtotal + sst;
  const daySlots = (slots.find(d => d.date === slotDate) || {}).slots || [];

  const handleLogin = (loggedInUser) => {
    setShowAuth(false);
    fetch(API + '/auth/me.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        const u = result.success ? result.user : loggedInUser;
        setUser(u);
        fillFromUser(u);
      })
      .catch(() => setUser(loggedInUser));
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!isValidPhone(form.phone)) return setError('Please enter a valid phone number, for example 012-345 6789.');
    if (deliveryType === 'Delivery' && !addressReady) {
      return setError('Please complete your address. The postcode must be 5 digits.');
    }
    if (!slotDate || !slotTime) {
      return setError('Please choose a ' + (deliveryType === 'Delivery' ? 'delivery' : 'pickup') + ' time slot.');
    }
    if (quoteError) return setError(quoteError);
    if (cart.length === 0) return setError('Your cart is empty.');

    setSubmitting(true);
    postJSON('/payment/create_checkout_session.php', {
      branch_id: branchId,
      customer_name: form.name,
      customer_phone: form.phone,
      delivery_type: deliveryType,
      payment_method: paymentMethod,
      street: form.street,
      city: form.city,
      state: form.state,
      postcode: form.postcode,
      slot_date: slotDate,
      slot_time: slotTime,
      save_details: saveDetails,
      items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
    })
      .then(result => {
        if (!result.success) {
          setError(result.message);
          setSubmitting(false);
        } else if (result.checkout_url) {
          window.location.href = result.checkout_url;
        } else {
          clearSavedCart(branchId);
          window.location.href = result.redirect_url;
        }
      })
      .catch(() => {
        setError('Could not connect to the server.');
        setSubmitting(false);
      });
  };

  const submitLabel = submitting
    ? 'Please wait...'
    : paymentMethod === 'Stripe'
      ? 'Pay ' + rm(total)
      : 'Place order, ' + (paymentMethod === 'COD' ? 'pay on delivery' : 'pay at store') + ' (' + rm(total) + ')';

  return (
    <PageShell>
      {showAuth && <CustomerAuth onLogin={handleLogin} onClose={() => setShowAuth(false)} />}

      <div className="cart-page-head">
        <div>
          <h1>Your Cart</h1>
          {branchName && <p className="page-lead">Packed by {branchName}</p>}
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
          <div className="cart-page-main">
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

            {checkingUser ? null : !user ? (
              <section className="checkout-section login-gate">
                <h3>Log in to check out</h3>
                <p>You need an account to place an order, so you can follow it in My Orders. Your cart will be kept.</p>
                <button className="btn btn-primary" onClick={() => setShowAuth(true)}>Login / Register</button>
              </section>
            ) : (
              <form id="checkout-form" className="checkout-sections" onSubmit={handleCheckout} noValidate>
                <section className="checkout-section">
                  <h3>1. How would you like to get your order?</h3>
                  <div className="choice-grid">
                    <label className={'choice' + (deliveryType === 'Delivery' ? ' active' : '')}>
                      <input type="radio" name="dtype" checked={deliveryType === 'Delivery'} onChange={() => chooseDelivery('Delivery')} />
                      <strong>Home delivery</strong>
                      <small>
                        {settings
                          ? 'RM ' + Number(settings.delivery_base_fee).toFixed(2) + ' for the first ' + settings.delivery_base_km + ' km, +RM ' + Number(settings.delivery_per_km).toFixed(2) + '/km after. Free from ' + rm(settings.free_delivery_threshold) + '.'
                          : 'Delivery fee by distance'}
                      </small>
                    </label>
                    <label className={'choice' + (deliveryType === 'Pickup' ? ' active' : '')}>
                      <input type="radio" name="dtype" checked={deliveryType === 'Pickup'} onChange={() => chooseDelivery('Pickup')} />
                      <strong>Self pickup</strong>
                      <small>Collect at {branchName || 'the branch'}. No delivery fee.</small>
                    </label>
                  </div>
                </section>

                <section className="checkout-section">
                  <h3>2. Contact{deliveryType === 'Delivery' ? ' and address' : ''}</h3>
                  <div className="field-grid">
                    <label>
                      Full name
                      <input type="text" autoComplete="name" value={form.name} onChange={setField('name')} />
                    </label>
                    <label>
                      Phone number
                      <input type="tel" autoComplete="tel" placeholder="e.g. 012-345 6789" value={form.phone} onChange={setField('phone')} />
                    </label>
                    {deliveryType === 'Delivery' && (
                      <>
                        <label className="span-2">
                          Street address
                          <input type="text" autoComplete="street-address" placeholder="House no., street, taman" value={form.street} onChange={setField('street')} />
                        </label>
                        <label>
                          Postcode
                          <input type="text" inputMode="numeric" maxLength={5} autoComplete="postal-code" placeholder="41200" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value.replace(/\D/g, '') })} />
                        </label>
                        <label>
                          City
                          <input type="text" autoComplete="address-level2" placeholder="Klang" value={form.city} onChange={setField('city')} />
                        </label>
                        <label className="span-2">
                          State
                          <select value={form.state} onChange={setField('state')}>
                            {(settings ? settings.states : ['Selangor']).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                      </>
                    )}
                  </div>
                  <label className="checkbox">
                    <input type="checkbox" checked={saveDetails} onChange={(e) => setSaveDetails(e.target.checked)} />
                    Save my phone number{deliveryType === 'Delivery' ? ' and address' : ''} for next time
                  </label>
                </section>

                <section className="checkout-section">
                  <h3>3. {deliveryType === 'Delivery' ? 'Delivery' : 'Pickup'} time</h3>
                  {slots.length === 0 ? (
                    <p className="hint">No time slots available right now.</p>
                  ) : (
                    <>
                      <div className="date-row">
                        {slots.map(d => (
                          <button
                            type="button" key={d.date}
                            className={'date-chip' + (slotDate === d.date ? ' active' : '')}
                            onClick={() => { setSlotDate(d.date); setSlotTime(''); }}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      <div className="slot-row">
                        {daySlots.map(t => (
                          <button
                            type="button" key={t}
                            className={'slot-chip' + (slotTime === t ? ' active' : '')}
                            onClick={() => setSlotTime(t)}
                          >
                            {t.replace('-', ' – ')}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="hint">
                    Same-day {deliveryType === 'Delivery' ? 'delivery' : 'pickup'} is only available for orders placed before
                    {' '}{settings ? settings.same_day_cutoff.replace(/^15:00$/, '3:00pm') : '3:00pm'}. Closed on Sundays.
                  </p>
                </section>

                <section className="checkout-section">
                  <h3>4. Payment</h3>
                  <div className="choice-grid">
                    {PAYMENT_OPTIONS[deliveryType].map(opt => (
                      <label key={opt.value} className={'choice' + (paymentMethod === opt.value ? ' active' : '')}>
                        <input type="radio" name="pmethod" checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} />
                        <strong>{opt.label}</strong>
                        <small>{opt.note}</small>
                      </label>
                    ))}
                  </div>
                </section>
              </form>
            )}
          </div>

          <aside className="cart-page-side">
            <div className="cart-panel cart-page-summary">
              <h2>Order Summary</h2>
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{rm(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>SST ({Math.round(sstRate * 100)}%)</span>
                  <span>{rm(quote ? quote.sst : sst)}</span>
                </div>
                <div className="summary-row">
                  <span>
                    {deliveryType === 'Pickup' ? 'Self pickup' : 'Delivery'}
                    {quote && quote.distance_km !== null && <small className="distance"> ({Number(quote.distance_km).toFixed(1)} km)</small>}
                  </span>
                  {deliveryType === 'Pickup'
                    ? <span className="free">FREE</span>
                    : quoting
                      ? <span className="muted">Calculating...</span>
                      : quote
                        ? (quote.delivery_fee === 0 ? <span className="free">FREE</span> : <span>{rm(quote.delivery_fee)}</span>)
                        : <span className="muted">Enter address</span>}
                </div>
                {deliveryType === 'Delivery' && amountToFree > 0 && (
                  <div className="free-progress">
                    <span>Add <strong>{rm(amountToFree)}</strong> more for FREE delivery</span>
                    <div className="bar"><div style={{ width: Math.min(100, (subtotal / freeThreshold) * 100) + '%' }} /></div>
                  </div>
                )}
                {quoteError && <div className="auth-error">{quoteError}</div>}
              </div>
              <div className="cart-total">
                <span>Total</span>
                <strong>{rm(total)}</strong>
              </div>
              {user && (
                <>
                  {error && <div className="auth-error">{error}</div>}
                  <button type="submit" form="checkout-form" className="btn btn-primary btn-block" disabled={submitting || quoting}>
                    {submitLabel}
                  </button>
                  {slotDate && slotTime && (
                    <small className="secure-note">
                      {deliveryType === 'Delivery' ? 'Delivery' : 'Pickup'}: {(slots.find(d => d.date === slotDate) || {}).label}, {slotTime.replace('-', ' – ')}
                    </small>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

export default CartPage;
