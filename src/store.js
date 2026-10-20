import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import CustomerAuth from './CustomerAuth';
import { Stars } from './Stars';
import { SiteFooter, WhatsAppButton } from './Layout';
import ProductModal, { productImageUrl } from './ProductModal';
import { loadSavedBranch, saveBranch, loadSavedCart, saveCart, clearSavedCart, rebuildCart } from './cartStorage';

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

export function withPricing(product) {
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
    () => Number(new URLSearchParams(window.location.search).get('branch')) || loadSavedBranch() || 1
  );
  const hydratedBranch = useRef(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [notice, setNotice] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch(API + '/shop/get_settings.php')
      .then(res => res.json())
      .then(result => {
        if (result.success) setSettings(result.data);
      })
      .catch(err => console.error('Error fetching shop settings:', err));
  }, []);

  const showNotice = (text, type = 'info') => setNotice({ text, type });

  useEffect(() => {
    fetch(API + '/auth/me.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setUser(result.user);
      })
      .catch(err => console.error('Error checking login:', err));
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setShowAuth(false);
    showNotice('Welcome, ' + loggedInUser.name + '!', 'success');
  };

  const handleLogout = () => {
    fetch(API + '/auth/logout.php', { credentials: 'include' })
      .finally(() => {
        setUser(null);
        showNotice('You have logged out.');
      });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      clearSavedCart();
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
    saveBranch(branchId);
    setCart([]);
    setLoadingProducts(true);
    fetch(API + '/products/get_products.php?branch_id=' + branchId)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          const priced = result.data.map(withPricing);
          setProducts(priced);
          setCart(rebuildCart(loadSavedCart(branchId), priced));
        }
      })
      .catch(err => console.error('Error fetching products:', err))
      .finally(() => {
        hydratedBranch.current = branchId;
        setLoadingProducts(false);
      });
  }, [branchId]);

  useEffect(() => {
    if (hydratedBranch.current === branchId) saveCart(branchId, cart);
  }, [cart, branchId]);

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

  const addToCart = (product, qty = 1) => {
    const existing = cart.find(item => item.product_id === product.product_id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + qty > product.stock) {
      showNotice('Only ' + product.stock + ' of ' + product.name + ' available at this branch.', 'error');
      return;
    }
    setNotice(null);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.product_id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: qty }]);
    }
  };

  const cartQtyOf = (product) => {
    const item = cart.find(i => i.product_id === product.product_id);
    return item ? item.quantity : 0;
  };

  const showCollections = category === 'All' && !search.trim();

  const collections = [
    {
      key: 'promo',
      title: 'Monthly Promotions',
      chip: PROMOTIONS,
      items: products.filter(p => p.on_sale).sort((a, b) => b.discount_percent - a.discount_percent).slice(0, 4)
    },
    {
      key: 'best',
      title: 'Best Sellers',
      items: products.filter(p => Number(p.sold) > 0).sort((a, b) => Number(b.sold) - Number(a.sold)).slice(0, 4)
    },
    {
      key: 'new',
      title: 'New Arrivals',
      items: [...products].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || b.product_id - a.product_id).slice(0, 4)
    }
  ].filter(col => col.items.length > 0);

  const renderCard = (product) => {
    const badge = stockBadge(product.stock);
    const inCart = cart.find(item => item.product_id === product.product_id);
    return (
      <div key={product.product_id} className="product-card">
        <div
          className="product-image clickable"
          onClick={() => setDetailProduct(product)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setDetailProduct(product); }}
          aria-label={'View details of ' + product.name}
        >
          {productImageUrl(product)
            ? <img src={productImageUrl(product)} alt={product.name} loading="lazy" />
            : <span>{productIcon(product)}</span>}
          <span className={'stock-badge ' + badge.cls}>{badge.text}</span>
          {product.on_sale && <span className="sale-badge">-{product.discount_percent}%</span>}
        </div>
        <div className="product-info">
          <span className="product-category">{product.category}</span>
          <h3 className="clickable" onClick={() => setDetailProduct(product)}>{product.name}</h3>
          {Number(product.review_count) > 0 && (
            <span className="card-rating">
              <Stars value={product.avg_rating} /> {Number(product.avg_rating).toFixed(1)} ({product.review_count})
            </span>
          )}
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
          {Number(product.sold) > 0 && <span className="sold-count">{product.sold} sold</span>}
          {inCart && <span className="in-cart">✓ {inCart.quantity} in cart</span>}
        </div>
      </div>
    );
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
  const sstRate = settings ? settings.sst_rate : 0.06;
  const cartSst = Math.round(cartSubtotal * sstRate * 100) / 100;
  const amountToFree = settings ? settings.free_delivery_threshold - cartSubtotal : 0;
  const cartTotal = cartSubtotal + cartSst;

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
          <a href="/cart" className="cart-button" aria-label="View cart">
            🛒 <span className="cart-count">{cartCount}</span>
          </a>
        </div>
      </header>

      {showAuth && <CustomerAuth onLogin={handleLogin} onClose={() => setShowAuth(false)} />}
      {detailProduct && (
        <ProductModal
          product={detailProduct}
          icon={productIcon(detailProduct)}
          inCartQty={cartQtyOf(detailProduct)}
          onAdd={addToCart}
          onClose={() => setDetailProduct(null)}
        />
      )}

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
            <>
              {showCollections && collections.map(col => (
                <section key={col.key} className="collection">
                  <div className="collection-head">
                    <h2>{col.title}</h2>
                    {col.chip && (
                      <button className="link-button" onClick={() => setCategory(col.chip)}>See all</button>
                    )}
                  </div>
                  <div className="product-grid">{col.items.map(renderCard)}</div>
                </section>
              ))}
              <section className="collection">
                {showCollections && (
                  <div className="collection-head"><h2>All products</h2></div>
                )}
                <div className="product-grid">{visibleProducts.map(renderCard)}</div>
              </section>
            </>
          )}
        </main>

        <aside className="cart-panel">
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
                    <span className="cart-icon">
                      {productImageUrl(item) ? <img src={productImageUrl(item)} alt="" /> : productIcon(item)}
                    </span>
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
                  <span>SST ({Math.round(sstRate * 100)}%)</span>
                  <span>{rm(cartSst)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  {settings && amountToFree <= 0
                    ? <span className="free">FREE</span>
                    : <span className="muted">At checkout</span>}
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
                <span>Total{settings && amountToFree > 0 ? ' (before delivery)' : ''}</span>
                <strong>{rm(cartTotal)}</strong>
              </div>

              <a href="/cart" className="btn btn-primary btn-block">Checkout</a>
              <small className="secure-note">Login, choose delivery or pickup, and pay on the next page</small>
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
