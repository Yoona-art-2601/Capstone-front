import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import CustomerAuth from './CustomerAuth';
import { SiteFooter, WhatsAppButton, useReveal, branchStatus, hoursRows, shortBranch } from './Layout';
import ProductModal, { productImageUrl } from './ProductModal';

const API = 'http://localhost/beaconmart-project/backend';

const rm = (value) => 'RM ' + Number(value).toFixed(2);

const OFFERS = 'On offer';

const HERO_CROPS = [
  ['drumettes (10', 2, '50% 60%'],
  ['wingettes (10', 2, '50% 60%'],
  ['marinated seaweed chicken wingettes', 1.45, '32% 58%'],
  ['nuggets', 1.5, '45% 64%'],
  ['sausages', 1.7, '55% 84%']
];

function heroCrop(product) {
  const name = (product.name || '').toLowerCase();
  const crop = HERO_CROPS.find(([key]) => name.includes(key));
  return crop ? { '--zoom': crop[1], '--focus': crop[2] } : null;
}

export function shortName(name) {
  return (name || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

function packSize(name) {
  const m = /\(([^)]*)\)/.exec(name || '');
  return m ? m[1] : '';
}

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

function stockNote(product, branch) {
  if (product.stock <= 0) return 'Sold out at ' + branch;
  if (product.stock <= 5) return 'Only ' + product.stock + ' left at ' + branch;
  return null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function Specimen({ items, branch, status, onAdd, onOpen, settings, cartQtyOf }) {
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (pinned || reduced || items.length < 2) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex(i => (i + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [pinned, reduced, items.length]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  const choose = (i) => {
    setPinned(true);
    setIndex(i);
  };

  const current = items[index] || items[0];

  return (
    <section className="hero" aria-label="Beacon seaweed chicken">
      <div className="hero-top">
        <h1 className="hero-wordmark" data-rise style={{ '--i': 0 }}>Beacon Mart</h1>
        <div className="hero-intro" data-rise style={{ '--i': 1 }}>
          <p>Healthier groceries from our own farm and Sabah’s waters, packed by the branch nearest you.</p>
          {status && (
            <p className={'hero-status' + (status.open ? ' is-open' : '')}>
              {branch}: {status.text}.
              {settings && <> Free delivery from RM&nbsp;{Number(settings.free_delivery_threshold).toFixed(0)}.</>}
            </p>
          )}
        </div>
      </div>

      {current && (
        <div className="specimen">
          <ul className="specimen-names" aria-label="Beacon chicken range">
            {items.map((p, i) => (
              <li key={p.product_id}>
                <button
                  className={i === index ? 'is-current' : ''}
                  aria-pressed={i === index}
                  onClick={() => choose(i)}
                >
                  {shortName(p.name)}
                </button>
              </li>
            ))}
          </ul>

          <div className={'specimen-tile tint-' + (index % 2 ? 'b' : 'a')} data-rise style={{ '--i': 2 }}>
            {items.map((p, i) => (
              <button
                key={p.product_id}
                className={'specimen-photo' + (i === index ? ' is-on' : '')}
                onClick={() => onOpen(p)}
                tabIndex={i === index ? 0 : -1}
                aria-hidden={i !== index}
                aria-label={'Details of ' + p.name}
              >
                <img src={productImageUrl(p)} alt={p.name} width="640" height="640" style={heroCrop(p)} />
              </button>
            ))}
          </div>

          <div className="specimen-buy" data-rise style={{ '--i': 3 }}>
            <p className="specimen-fact">
              <strong>{shortName(current.name)}</strong>
              {packSize(current.name) && <>, {packSize(current.name)}</>}.{' '}
              {rm(current.unit_price)}
              {current.on_sale && <> instead of {rm(current.price)}</>}
              {current.stock > 0 ? ', ' + current.stock + ' on the shelf at ' + branch + '.' : ', sold out at ' + branch + '.'}
            </p>
            <button
              className="button button-accent button-wide"
              onClick={() => onAdd(current)}
              disabled={current.stock <= 0 || cartQtyOf(current) >= current.stock}
            >
              {current.stock <= 0 ? 'Sold out' : 'Add to cart'}
            </button>
          </div>
        </div>
      )}

      <nav className="hero-links" aria-label="Shortcuts">
        <a href="#offers">This month’s offers</a>
        <a href="#shelves">Browse the shelves</a>
        <a href="#visit">Find the store</a>
      </nav>
    </section>
  );
}

function Offers({ items, onAdd, onOpen, cartQtyOf }) {
  const [index, setIndex] = useState(0);
  const current = items[index] || items[0];
  if (!current) return null;

  return (
    <section className="offers" id="offers" aria-labelledby="offers-title">
      <div className="offers-disc-wrap" data-reveal>
        <div className={'offers-disc tint-' + (index % 2 ? 'b' : 'a')}>
          {items.map((p, i) => (
            <button
              key={p.product_id}
              className={'offers-photo' + (i === index ? ' is-on' : '')}
              onClick={() => onOpen(p)}
              tabIndex={i === index ? 0 : -1}
              aria-hidden={i !== index}
              aria-label={'Details of ' + p.name}
            >
              <img src={productImageUrl(p)} alt={p.name} width="640" height="640" loading="lazy" />
            </button>
          ))}
        </div>
        <div className="offers-fact">
          <p>
            {rm(current.unit_price)} this month, usually {rm(current.price)}. That is {current.discount_percent}% off.
          </p>
          <button
            className="button button-accent"
            onClick={() => onAdd(current)}
            disabled={current.stock <= 0 || cartQtyOf(current) >= current.stock}
          >
            {current.stock <= 0 ? 'Sold out' : 'Add to cart'}
          </button>
        </div>
      </div>

      <ul className="offers-names" data-reveal>
        <li><h2 id="offers-title">This month’s offers</h2></li>
        {items.map((p, i) => (
          <li key={p.product_id}>
            <button className={i === index ? 'is-current' : ''} aria-pressed={i === index} onClick={() => setIndex(i)}>
              {shortName(p.name)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Story({ onShopChicken }) {
  return (
    <section className="story" aria-labelledby="story-title">
      <div className="story-panel">
        <div className="story-left">
          <h2 id="story-title" data-reveal>Raised on seaweed,<br />caught at sea</h2>
          <figure className="story-figure" data-reveal>
            <img
              src="/assets/lahad-datu-sabah-fishing-vessels-01.jpg"
              alt="A blue and red fishing boat moored off Lahad Datu, Sabah"
              width="1920"
              height="1280"
            />
          </figure>
        </div>
        <div className="story-right">
          <div className="story-block" data-reveal>
            <h3>Beacon seaweed chicken</h3>
            <p>
              Our chickens are raised on Beacon’s own farms on a feed of seaweed, moringa, fruit enzymes and
              probiotics, without antibiotics or hormones. The fresh cuts, the marinated range and the chicken
              essence all start there.
            </p>
          </div>
          <div className="story-block" data-reveal>
            <h3>Wild-caught Sabah seafood</h3>
            <p>
              Flower prawns, tiger prawns, ikan kembung and fish belly come from the deep sea off Sabah and are
              frozen soon after the catch, so they reach the freezer at your branch the way they left the boat.
            </p>
          </div>
          <button className="button button-accent" onClick={onShopChicken} data-reveal>Shop Beacon Chicken</button>
          <p className="story-credit">Fishing boats off Lahad Datu, Sabah. Photograph by CEphoto, Uwe Aranas, CC BY-SA 3.0.</p>
        </div>
      </div>
    </section>
  );
}

function Shelves({ products, loading, branch, search, setSearch, filter, setFilter, filters, onAdd, onOpen, cartQtyOf }) {
  const groups = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const key = p.category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return Array.from(map.entries());
  }, [products]);

  return (
    <section className="shelves" id="shelves" aria-labelledby="shelves-title">
      <h2 id="shelves-title" className="shelves-title" data-reveal>On the shelves at {branch}</h2>

      <div className="shelves-tools">
        <input
          className="search"
          type="search"
          placeholder="Search the shelves"
          aria-label="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <nav className="shelf-filters" aria-label="Categories">
          {filters.map(f => (
            <button key={f} className={filter === f ? 'is-current' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </nav>
      </div>

      {loading && <p className="shelves-empty">Loading the shelves…</p>}
      {!loading && groups.length === 0 && <p className="shelves-empty">Nothing on the shelves matches that.</p>}

      {groups.map(([cat, items]) => (
        <div className="shelf" key={cat}>
          <div className="shelf-head" data-reveal>
            <h3>{cat}</h3>
            <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </div>
          <ul className="shelf-items">
            {items.map(p => {
              const note = stockNote(p, branch);
              const inCart = cartQtyOf(p);
              return (
                <li key={p.product_id} className="shelf-item" data-reveal>
                  <button className="shelf-photo" onClick={() => onOpen(p)} aria-label={'Details of ' + p.name}>
                    {productImageUrl(p) && <img src={productImageUrl(p)} alt="" width="72" height="72" loading="lazy" />}
                  </button>
                  <div className="shelf-text">
                    <div className="shelf-line">
                      <button className="shelf-name" onClick={() => onOpen(p)}>{p.name}</button>
                      <span className="shelf-price">
                        {rm(p.unit_price)}
                        {p.on_sale && <s>{rm(p.price)}</s>}
                      </span>
                    </div>
                    {(p.on_sale || note || inCart > 0) && (
                      <p className="shelf-note">
                        {p.on_sale && <>{p.discount_percent}% off this month. </>}
                        {note && <>{note}. </>}
                        {inCart > 0 && <>{inCart} in your cart.</>}
                      </p>
                    )}
                    {p.description && <p className="shelf-desc">{p.description}</p>}
                    <button
                      className="button button-quiet shelf-add"
                      onClick={() => onAdd(p)}
                      disabled={p.stock <= 0 || inCart >= p.stock}
                    >
                      {p.stock <= 0 ? 'Sold out' : inCart > 0 ? 'Add another' : 'Add to cart'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Visit({ branch }) {
  if (!branch) return null;
  const rows = hoursRows(branch);
  const status = branchStatus(branch);
  return (
    <section className="visit" id="visit" aria-labelledby="visit-title">
      <img
        className="visit-photo"
        src="/assets/klang-river-6.jpg"
        alt="The Klang River at sunset, with grass banks and apartment blocks"
        width="1920"
        height="1080"
        loading="lazy"
      />
      <div className="visit-card" data-reveal>
        <h2 id="visit-title">Visit {shortBranch(branch.branch_name)}</h2>
        <p className="visit-address">{branch.address}</p>
        {status && <p className="visit-status">{status.text.charAt(0).toUpperCase() + status.text.slice(1)}.</p>}
        <dl className="visit-hours">
          {rows.map(([day, time]) => (
            <div key={day}><dt>{day}</dt><dd>{time}</dd></div>
          ))}
        </dl>
        {branch.phone && <a className="visit-phone" href={'tel:' + branch.phone.replace(/[^0-9+]/g, '')}>{branch.phone}</a>}
        <a
          className="button button-accent button-block"
          href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(branch.address)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get directions
        </a>
      </div>
      <p className="visit-credit">The Klang River at Puchong Jaya. Photograph by Slleong, CC0.</p>
    </section>
  );
}

function CartDrawer({
  open, onClose, cart, branch, settings, changeQty, removeFromCart, subtotal, deliveryFee, amountToFree, total,
  user, onLogin, customerName, setCustomerName, customerPhone, setCustomerPhone, customerAddress, setCustomerAddress,
  onCheckout, submitting
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={'drawer-layer' + (open ? ' is-open' : '')} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="drawer-head">
          <h2>Your cart</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close cart">Close</button>
        </div>
        <p className="drawer-branch">Packed at {branch}.</p>

        {cart.length === 0 ? (
          <p className="drawer-empty">Nothing in the cart yet. Pick something from the shelves.</p>
        ) : (
          <>
            <ul className="drawer-items">
              {cart.map(item => (
                <li key={item.product_id}>
                  <span className="drawer-photo">
                    {productImageUrl(item) && <img src={productImageUrl(item)} alt="" width="56" height="56" />}
                  </span>
                  <div className="drawer-item-text">
                    <strong>{item.name}</strong>
                    <span>{rm(item.unit_price)} each</span>
                    <div className="qty">
                      <button onClick={() => changeQty(item.product_id, -1)} aria-label={'One less ' + item.name}>−</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item.product_id, 1)}
                        disabled={item.quantity >= item.stock}
                        aria-label={'One more ' + item.name}
                      >+</button>
                    </div>
                  </div>
                  <div className="drawer-item-end">
                    <strong>{rm(item.quantity * item.unit_price)}</strong>
                    <button className="text-button" onClick={() => removeFromCart(item.product_id)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="drawer-sums">
              <div><dt>Subtotal</dt><dd>{rm(subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{deliveryFee === 0 ? 'Free' : rm(deliveryFee)}</dd></div>
              <div className="drawer-total"><dt>Total</dt><dd>{rm(total)}</dd></div>
            </dl>

            {settings && (
              <div className="free-meter">
                <p>
                  {amountToFree > 0
                    ? <>Add {rm(amountToFree)} more for free delivery.</>
                    : <>Delivery is free on this order.</>}
                </p>
                <div className="meter" aria-hidden="true">
                  <span style={{ transform: 'scaleX(' + Math.min(1, subtotal / settings.free_delivery_threshold) + ')' }} />
                </div>
              </div>
            )}

            <form className="checkout" onSubmit={onCheckout}>
              <h3>Delivery details</h3>
              {!user && (
                <p className="checkout-hint">
                  <button type="button" className="text-button" onClick={onLogin}>Log in</button> to follow this
                  order in My orders, or carry on as a guest.
                </p>
              )}
              <label>
                Full name
                <input type="text" autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </label>
              <label>
                Phone number
                <input
                  type="tel" autoComplete="tel" placeholder="012-345 6789" value={customerPhone}
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
              <button type="submit" className="button button-accent button-block" disabled={submitting}>
                {submitting ? 'Opening Stripe…' : 'Pay ' + rm(total)}
              </button>
              <p className="checkout-note">Card payment is handled on Stripe’s secure page.</p>
            </form>
          </>
        )}
      </aside>
    </div>
  );
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
  const [filter, setFilter] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [settings, setSettings] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const noticeTimer = useRef(null);

  useReveal();

  const showNotice = (text, type = 'info') => {
    setNotice({ text, type });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), type === 'error' ? 7000 : 4500);
  };

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    fetch(API + '/shop/get_settings.php')
      .then(res => res.json())
      .then(result => {
        if (result.success) setSettings(result.data);
      })
      .catch(err => console.error('Error fetching shop settings:', err));
  }, []);

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
    showNotice('Welcome, ' + loggedInUser.name + '.', 'success');
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
      showNotice('Payment received. Order #' + params.get('order_id') + ' is with the branch now.', 'success');
    } else if (payment === 'cancelled') {
      showNotice('Payment cancelled, so the order was not placed.', 'error');
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

  const branch = branches.find(b => b.branch_id === branchId);
  const branchShort = shortBranch(branch ? branch.branch_name : '');
  const status = branchStatus(branch);

  const specimenItems = useMemo(
    () => products
      .filter(p => productImageUrl(p) && heroCrop(p))
      .sort((a, b) => HERO_CROPS.findIndex(([k]) => a.name.toLowerCase().includes(k)) - HERO_CROPS.findIndex(([k]) => b.name.toLowerCase().includes(k))),
    [products]
  );

  const offerItems = useMemo(
    () => products.filter(p => p.on_sale && productImageUrl(p)).sort((a, b) => b.discount_percent - a.discount_percent),
    [products]
  );

  const filters = useMemo(
    () => [
      'All',
      ...(products.some(p => p.on_sale) ? [OFFERS] : []),
      ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()
    ],
    [products]
  );

  const shelfProducts = products
    .filter(p =>
      (filter === 'All' || (filter === OFFERS ? p.on_sale : p.category === filter)) &&
      p.name.toLowerCase().includes(search.trim().toLowerCase())
    )
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));

  const addToCart = (product, qty = 1) => {
    const existing = cart.find(item => item.product_id === product.product_id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + qty > product.stock) {
      showNotice('Only ' + product.stock + ' of ' + product.name + ' at ' + branchShort + '.', 'error');
      return;
    }
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.product_id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: qty }]);
    }
    setBump(b => b + 1);
    showNotice(shortName(product.name) + ' added to your cart.', 'success');
  };

  const cartQtyOf = (product) => {
    const item = cart.find(i => i.product_id === product.product_id);
    return item ? item.quantity : 0;
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

  const shopChicken = () => {
    setFilter('Beacon Chicken');
    setSearch('');
    const el = document.getElementById('shelves');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="site store">
      <header className="site-bar">
        <nav className="bar-links" aria-label="Main">
          <a href="#shelves">Shop</a>
          <a href="/stores">Stores</a>
          {user && <a href="/my-orders">My orders</a>}
        </nav>
        <label className="bar-branch">
          <span className="visually-hidden">Branch</span>
          <select value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
            {branches.map(b => (
              <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
            ))}
          </select>
        </label>
        <div className="bar-account">
          {user ? (
            <>
              <span className="bar-greeting">Hi, {user.name}</span>
              <button className="text-button" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <button className="text-button" onClick={() => setShowAuth(true)}>Log in</button>
          )}
        </div>
        <button className="button button-accent bar-action" onClick={() => setCartOpen(true)}>
          Cart <span key={bump} className={'cart-count' + (bump ? ' is-bumped' : '')}>{cartCount}</span>
        </button>
      </header>

      {showAuth && <CustomerAuth onLogin={handleLogin} onClose={() => setShowAuth(false)} />}
      {detailProduct && (
        <ProductModal
          product={detailProduct}
          branch={branchShort}
          inCartQty={cartQtyOf(detailProduct)}
          onAdd={addToCart}
          onClose={() => setDetailProduct(null)}
        />
      )}

      <main>
        <Specimen
          items={specimenItems}
          branch={branchShort}
          status={status}
          settings={settings}
          onAdd={addToCart}
          onOpen={setDetailProduct}
          cartQtyOf={cartQtyOf}
        />
        <Offers items={offerItems} onAdd={addToCart} onOpen={setDetailProduct} cartQtyOf={cartQtyOf} />
        <Story onShopChicken={shopChicken} />
        <Shelves
          products={shelfProducts}
          loading={loadingProducts}
          branch={branchShort}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          filters={filters}
          onAdd={addToCart}
          onOpen={setDetailProduct}
          cartQtyOf={cartQtyOf}
        />
        <Visit branch={branch} />
      </main>

      <SiteFooter />
      <WhatsAppButton />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        branch={branchShort}
        settings={settings}
        changeQty={changeQty}
        removeFromCart={removeFromCart}
        subtotal={cartSubtotal}
        deliveryFee={deliveryFee}
        amountToFree={amountToFree}
        total={cartTotal}
        user={user}
        onLogin={() => setShowAuth(true)}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerAddress={customerAddress}
        setCustomerAddress={setCustomerAddress}
        onCheckout={handleCheckout}
        submitting={submitting}
      />

      <div className="toast-region" role="status" aria-live="polite">
        {notice && (
          <div className={'toast toast-' + notice.type}>
            <span>{notice.text}</span>
            {notice.type === 'success' && cartCount > 0 && !cartOpen && (
              <button className="text-button" onClick={() => { setNotice(null); setCartOpen(true); }}>View cart</button>
            )}
            <button className="toast-close" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Store;
