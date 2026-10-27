import { useState, useEffect } from 'react';
import { API, getJSON } from './api';
import NotificationBell from './NotificationBell';
import CustomerAuth, { AUTH_EVENT } from './CustomerAuth';
import { loadSavedBranch, savedCartCount, CART_EVENT } from './cartStorage';
import './App.css';

let settingsPromise = null;

export function useShopSettings() {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    if (!settingsPromise) {
      settingsPromise = fetch(API + '/shop/get_settings.php')
        .then(res => res.json())
        .then(result => (result.success ? result.data : null))
        .catch(() => null);
    }
    settingsPromise.then(setSettings);
  }, []);
  return settings;
}

function Brand() {
  return (
    <a href="/" className="brand">
      <span className="brand-mark">🌿</span>
      <span>
        <span className="brand-name">Beacon Mart</span>
        <span className="brand-tag">Natural &amp; Healthy Food</span>
      </span>
    </a>
  );
}

export function SiteHeader({ user, cartCount, onLogin, onLogout, middle }) {
  return (
    <header className="topbar">
      <Brand />
      {middle}
      <nav className="topbar-actions">
        <a href="/stores" className="btn btn-ghost hide-mobile">Our Stores</a>
        {user ? (
          <>
            <NotificationBell />
            <a href="/account" className="account-link" aria-label="My account">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              <span className="greeting">Hi, {user.name}</span>
            </a>
            <a href="/my-orders" className="btn btn-ghost hide-mobile">My Orders</a>
            <button className="btn btn-ghost hide-mobile" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={onLogin}>Login / Register</button>
        )}
        <a href="/cart" className="cart-button" aria-label={'View cart, ' + cartCount + ' item(s)'}>
          🛒 <span className="cart-count">{cartCount}</span>
        </a>
      </nav>
    </header>
  );
}

function ShellHeader() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [cartCount, setCartCount] = useState(() => savedCartCount(loadSavedBranch() || 1));

  useEffect(() => {
    const loadUser = () => getJSON('/auth/me.php')
      .then(result => setUser(result.success ? result.user : null))
      .catch(() => {});
    const updateCart = () => setCartCount(savedCartCount(loadSavedBranch() || 1));
    loadUser();
    window.addEventListener(AUTH_EVENT, loadUser);
    window.addEventListener(CART_EVENT, updateCart);
    window.addEventListener('storage', updateCart);
    return () => {
      window.removeEventListener(AUTH_EVENT, loadUser);
      window.removeEventListener(CART_EVENT, updateCart);
      window.removeEventListener('storage', updateCart);
    };
  }, []);

  const logout = () => {
    fetch(API + '/auth/logout.php', { credentials: 'include' })
      .finally(() => window.location.reload());
  };

  return (
    <>
      <SiteHeader user={user} cartCount={cartCount} onLogin={() => setShowAuth(true)} onLogout={logout} />
      {showAuth && (
        <CustomerAuth
          onLogin={() => { setShowAuth(false); window.location.reload(); }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </>
  );
}

export function WhatsAppButton() {
  const settings = useShopSettings();
  if (!settings || !settings.whatsapp_number) return null;
  const text = encodeURIComponent('Hi Beacon Mart! I would like to enquire about my order / products.');
  return (
    <a
      className="whatsapp-button"
      href={'https://wa.me/' + settings.whatsapp_number + '?text=' + text}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C9.4 3 4 8.36 4 14.97c0 2.11.56 4.17 1.62 5.99L4 29l8.26-1.6a12.1 12.1 0 0 0 3.78.6C22.66 28 28 22.63 28 16.02 28 9.4 22.66 3 16.04 3Zm0 22.6c-1.2 0-2.38-.2-3.5-.6l-.25-.09-4.9.95.98-4.73-.16-.26a10.5 10.5 0 0 1-1.6-5.56c0-5.8 4.7-10.53 10.48-10.53 5.77 0 10.47 4.73 10.47 10.53-.01 5.58-4.7 10.3-10.52 10.3Zm5.75-7.8c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.15-.21.31-.82 1.02-1 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.56-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.61-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62 0 1.55 1.13 3.04 1.29 3.25.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.2 1.99.12.61-.09 1.86-.76 2.12-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37Z" />
      </svg>
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Brand />
          <p className="footer-about">
            A healthy mart chain bringing natural, farm-raised and wild-caught food to families in the Klang Valley.
          </p>
        </div>
        <div>
          <h4>Shop</h4>
          <a href="/">All Products</a>
          <a href="/stores">Where to Find Us</a>
          <a href="/my-orders">My Orders</a>
          <a href="/account">My Account</a>
        </div>
        <div>
          <h4>Information</h4>
          <a href="/about">About Us</a>
          <a href="/delivery-policy">Delivery Policy</a>
          <a href="/refund-policy">Return &amp; Refund Policy</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
        <div>
          <h4>Customer Service</h4>
          <a href="/contact">Contact Us</a>
          <span>Mon - Sat, 8:00am - 6:00pm</span>
          <span>🔒 Secure payment by Stripe</span>
        </div>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} Beacon Mart · Natural &amp; Healthy Food
      </div>
    </footer>
  );
}

export function PageShell({ children }) {
  return (
    <div className="my-orders-page">
      <ShellHeader />
      <div className="page-content">{children}</div>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
