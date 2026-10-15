import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import CustomerAuth from './CustomerAuth';
import { SiteFooter, WhatsAppButton } from './Layout';

const API = 'http://localhost/beaconmart-project/backend';

const CATEGORY_ICONS = [
  ['chicken', '🍗'], ['meat', '🥩'], ['seafood', '🐟'], ['fish', '🐟'],
  ['dried', '🌾'], ['rice', '🌾'], ['grain', '🌾'], ['vegetable', '🥬'],
  ['fruit', '🍎'], ['dairy', '🥛'], ['milk', '🥛'], ['egg', '🥚'],
  ['drink', '🧃'], ['beverage', '🧃'], ['coffee', '☕'], ['snack', '🥜'], ['nut', '🥜'],
  ['honey', '🍯'], ['health', '🍯'], ['wellness', '🍯'], ['ready', '🍳'], ['pantry', '🧂'], ['sauce', '🧂'],
];

const NAME_ICONS = [
  ['coffee', '☕'], ['juice', '🧃'], ['prawn', '🦐'], ['sausage', '🌭'], ['nugget', '🍗'],
  ['honey', '🍯'], ['essence', '🍵'], ['bird nest', '🥣'], ['shoyu', '🧂'], ['rice', '🌾'],
  ['salmon', '🐟'], ['mackerel', '🐟'], ['fish', '🐟'],
];

export function categoryIcon(category) {
  const c = (category || '').toLowerCase();
  const match = CATEGORY_ICONS.find(([key]) => c.includes(key));
  return match ? match[1] : '🛒';
}

export function productIcon(product) {
  const n = (product.name || '').toLowerCase();
  const match = NAME_ICONS.find(([key]) => n.includes(key));
  return match ? match[1] : categoryIcon(product.category);
}

const rm = (value) => 'RM ' + Number(value).toFixed(2);

const PROMOTIONS = 'Promotions';

function withPricing(product) {
  const price = Number(product.price);
  const sale = product.sale_price === null ? null : Number(product.sale_price);
  const onSale = sale !== null && sale < price;
  return {
    ...product,
    on_sale: onSale,
    unit_price: onSale ? sale : price,
    discount_percent: onSale ? Math.round((1 - sale / price) * 100) : 0
  };
}

function stockBadge(stock) {
  if (stock <= 0) return { text: 'Out of stock', cls: 'out' };
  if (stock <= 5) return { text: 'Only ' + stock + ' left', cls: 'low' };
  return { text: 'In stock', cls: 'ok' };
}

function Store() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(
    () => Number(new URLSearchParams(window.location.search).get('branch')) || 1
  );
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch(API + '/shop/get_settings.php')
      .then(res => res.json())
      .then(result => {
        if (result.success) setSettings(result.data);
      })
      .catch(err => console.error('Error fetching shop settings:', err));
  }, []);
  const cartRef = useRef(null);

  const showNotice = (text, type = 'info') => setNotice({ text, type });

  useEffect(() => {
    fetch(API + '/auth/me.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setUser(result.user);
          setCustomerName(result.user.name);
        }
      })
      .catch(err => console.error('Error checking login:', err));
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setCustomerName(loggedInUser.name);
    setShowAuth(false);
    showNotice('Welcome, ' + loggedInUser.name + '!', 'success');
  };

  const handleLogout = () => {
    fetch(API + '/auth/logout.php', { credentials: 'include' })
      .finally(() => {
        setUser(null);
        setCustomerName('');
        showNotice('You have logged out.');
      });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      showNotice('Payment successful! Order #' + params.get('order_id') + ' has been placed.', 'success');
    } else if (payment === 'cancelled') {
      showNotice('Payment cancelled. Your order was not placed.', 'error');
    }
    if (payment || params.get('branch')) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    fetch(API + '/branches/get_branches.php')
      .then(res => res.json())
      .then(result => {
        if (result.success) setBranches(result.data);
      })
      .catch(err => console.error('Error fetching branches:', err));
  }, []);

  useEffect(() => {
    setCart([]);
    setLoadingProducts(true);
    fetch(API + '/products/get_products.php?branch_id=' + branchId)
      .then(res => res.json())
      .then(result => {
        if (result.success) setProducts(result.data.map(withPricing));
      })
      .catch(err => console.error('Error fetching products:', err))
      .finally(() => setLoadingProducts(false));
  }, [branchId]);

  const categories = useMemo(
    () => [
      'All',
      ...(products.some(p => p.on_sale) ? [PROMOTIONS] : []),
      ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()
    ],
    [products]
  );

  const visibleProducts = products
    .filter(p =>
      (category === 'All' || (category === PROMOTIONS ? p.on_sale : p.category === category)) &&
      p.name.toLowerCase().includes(search.trim().toLowerCase())
    )
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));

  const branchName = (branches.find(b => b.branch_id === branchId) || {}).branch_name || '';

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.product_id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= product.stock) {
      showNotice('Only ' + product.stock + ' of ' + product.name + ' available at this branch.', 'error');
      return;
    }
    setNotice(null);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.product_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const changeQty = (productId, delta) => {
    setCart(cart
      .map(item => {
        if (item.product_id !== productId) return item;
        const quantity = Math.min(item.quantity + delta, item.stock);
        return { ...item, quantity };
      })
      .filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const deliveryFee = !settings || cartSubtotal >= settings.free_delivery_threshold ? 0 : settings.delivery_fee;
  const amountToFree = settings ? settings.free_delivery_threshold - cartSubtotal : 0;
  const cartTotal = cartSubtotal + deliveryFee;

  const handleCheckout = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showNotice('Please enter your name.', 'error');
      return;
    }
    if (!customerPhone.trim()) {
      showNotice('Please enter your phone number.', 'error');
      return;
    }
    if (!customerAddress.trim()) {
      showNotice('Please enter your delivery address.', 'error');
      return;
    }
    if (cart.length === 0) {
      showNotice('Your cart is empty.', 'error');
      return;
    }

    setSubmitting(true);
    setNotice(null);

    fetch(API + '/payment/create_checkout_session.php', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id: branchId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          window.location.href = result.checkout_url;
        } else {
          showNotice('Error: ' + result.message, 'error');
          setSubmitting(false);
        }
      })
      .catch(err => {
        console.error(err);
        showNotice('Could not connect to the server.', 'error');
        setSubmitting(false);
      });
  };

  return (
    <div className="store">
      {settings && (
        <div className="announcement">
          🚚 FREE delivery for orders {rm(settings.free_delivery_threshold)} and above
        </div>
      )}
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark">🌿</span>
          <span>
            <span className="brand-name">Beacon Mart</span>
            <span className="brand-tag">Natural &amp; Healthy Food</span>
          </span>
        </a>

        <label className="branch-picker">
          <span>📍</span>
          <select value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
            {branches.map(b => (
              <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
            ))}
          </select>
        </label>

        <div className="topbar-actions">
          <a href="/stores" className="btn btn-ghost hide-mobile">Our Stores</a>
          {user ? (
            <>
              <span className="greeting">Hi, {user.name}</span>
              <a href="/my-orders" className="btn btn-ghost">My Orders</a>
              <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => setShowAuth(true)}>Login / Register</button>
          )}
          <button
            className="cart-button"
            onClick={() => cartRef.current && cartRef.current.scrollIntoView({ behavior: 'smooth' })}
          >
            🛒 <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      {showAuth && <CustomerAuth onLogin={handleLogin} onClose={() => setShowAuth(false)} />}

      <section className="hero">
        <div>
          <h1>Fresh, natural groceries</h1>
          <p>
            Shopping at <strong>{branchName}</strong>. Prices and stock are shown for this branch.
          </p>
        </div>
      </section>

      <div className="store-body">
        <main className="catalog">
          {notice && (
            <div className={'notice-bar ' + notice.type}>
              <span>{notice.text}</span>
              <button onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
            </div>
          )}

          <div className="catalog-tools">
            <input
              className="search" type="search" placeholder="Search products..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
            <div className="chips">
              {categories.map(c => (
                <button
                  key={c}
                  className={'chip' + (category === c ? ' active' : '')}
                  onClick={() => setCategory(c)}
                >
                  {c === 'All' ? 'All' : c === PROMOTIONS ? '🏷️ ' + c : categoryIcon(c) + ' ' + c}
                </button>
              ))}
            </div>
          </div>

          {loadingProducts ? (
            <p className="empty">Loading products...</p>
          ) : visibleProducts.length === 0 ? (
            <p className="empty">No products found.</p>
          ) : (
            <div className="product-grid">
              {visibleProducts.map(product => {
                const badge = stockBadge(product.stock);
                const inCart = cart.find(item => item.product_id === product.product_id);
                return (
                  <div key={product.product_id} className="product-card">
                    <div className="product-image">
                      <span>{productIcon(product)}</span>
                      <span className={'stock-badge ' + badge.cls}>{badge.text}</span>
                      {product.on_sale && <span className="sale-badge">-{product.discount_percent}%</span>}
                    </div>
                    <div className="product-info">
                      <span className="product-category">{product.category}</span>
                      <h3>{product.name}</h3>
                      <div className="product-bottom">
                        <span className="price-block">
                          <span className={'price' + (product.on_sale ? ' sale' : '')}>{rm(product.unit_price)}</span>
                          {product.on_sale && <span className="price-old">{rm(product.price)}</span>}
                        </span>
                        <button
                          className="btn btn-primary"
                          onClick={() => addToCart(product)}
                          disabled={product.stock <= 0}
                        >
                          {product.stock <= 0 ? 'Sold out' : inCart ? 'Add more' : 'Add to cart'}
                        </button>
                      </div>
                      {inCart && <span className="in-cart">✓ {inCart.quantity} in cart</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <aside className="cart-panel" ref={cartRef}>
          <h2>Your Cart {cartCount > 0 && <span className="cart-count">{cartCount}</span>}</h2>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <span>🧺</span>
              <p>Your cart is empty.</p>
              <small>Add some fresh items to get started.</small>
            </div>
          ) : (
            <>
              <ul className="cart-items">
                {cart.map(item => (
                  <li key={item.product_id}>
                    <span className="cart-icon">{productIcon(item)}</span>
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <small>{rm(item.unit_price)} each</small>
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

              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{rm(cartSubtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  {deliveryFee === 0
                    ? <span className="free">FREE</span>
                    : <span>{rm(deliveryFee)}</span>}
                </div>
                {settings && amountToFree > 0 && (
                  <div className="free-progress">
                    <span>Add <strong>{rm(amountToFree)}</strong> more for FREE delivery</span>
                    <div className="bar">
                      <div style={{ width: Math.min(100, (cartSubtotal / settings.free_delivery_threshold) * 100) + '%' }} />
                    </div>
                  </div>
                )}
                {settings && amountToFree <= 0 && (
                  <div className="free-progress done">🎉 You've unlocked FREE delivery!</div>
                )}
              </div>

              <div className="cart-total">
                <span>Total</span>
                <strong>{rm(cartTotal)}</strong>
              </div>

              <form className="checkout-form" onSubmit={handleCheckout}>
                <h3>Delivery details</h3>
                {!user && (
                  <p className="login-hint">
                    <button type="button" className="link-button" onClick={() => setShowAuth(true)}>Login</button>
                    {' '}to track this order in My Orders, or continue as guest.
                  </p>
                )}
                <label>
                  Full name
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel" placeholder="e.g. 012-3456789" value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </label>
                <label>
                  Delivery address
                  <textarea
                    rows={3} placeholder="Street, postcode, city" value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? 'Redirecting to payment...' : 'Pay ' + rm(cartTotal)}
                </button>
                <small className="secure-note">🔒 Secure payment by Stripe</small>
              </form>
            </>
          )}
        </aside>
      </div>

      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}

export default Store;
