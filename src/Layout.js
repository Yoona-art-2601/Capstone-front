import { useState, useEffect } from 'react';
import './App.css';

const API = 'http://localhost/beaconmart-project/backend';

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

let branchesPromise = null;

export function useBranches() {
  const [branches, setBranches] = useState([]);
  useEffect(() => {
    if (!branchesPromise) {
      branchesPromise = fetch(API + '/branches/get_branches.php')
        .then(res => res.json())
        .then(result => (result.success ? result.data : []))
        .catch(() => []);
    }
    branchesPromise.then(setBranches);
  }, []);
  return branches;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toMinutes(text) {
  const m = /(\d{1,2}):?(\d{2})?\s*(am|pm)/i.exec(text || '');
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') h += 12;
  return h * 60 + Number(m[2] || 0);
}

function timeLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + (min ? ':' + String(min).padStart(2, '0') : '') + suffix;
}

export function parseHours(text) {
  if (!text) return null;
  const dayMatch = /(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\w*\s*[-–]\s*(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.exec(text);
  const times = text.split(',').slice(1).join(',').split(/[-–]/);
  const open = toMinutes(times[0]);
  const close = toMinutes(times[1]);
  if (!dayMatch || open === null || close === null) return null;
  const from = DAYS.findIndex(d => d.toLowerCase() === dayMatch[1].slice(0, 3).toLowerCase());
  const to = DAYS.findIndex(d => d.toLowerCase() === dayMatch[2].slice(0, 3).toLowerCase());
  const days = [];
  for (let d = from; ; d = (d + 1) % 7) {
    days.push(d);
    if (d === to) break;
  }
  return { days, open, close, firstDay: DAY_NAMES[from], lastDay: DAY_NAMES[to] };
}

function nowInKL() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const get = (t) => (parts.find(p => p.type === t) || {}).value;
  return { day: DAYS.indexOf(get('weekday')), minutes: Number(get('hour')) % 24 * 60 + Number(get('minute')) };
}

export function branchStatus(branch) {
  const hours = branch && parseHours(branch.opening_hours);
  if (!hours) return null;
  const now = nowInKL();
  const openToday = hours.days.includes(now.day);
  if (openToday && now.minutes >= hours.open && now.minutes < hours.close) {
    return { open: true, text: 'open now, closes ' + timeLabel(hours.close) };
  }
  if (openToday && now.minutes < hours.open) {
    return { open: false, text: 'closed now, opens ' + timeLabel(hours.open) };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (now.day + i) % 7;
    if (hours.days.includes(d)) {
      return { open: false, text: 'closed now, opens ' + (i === 1 ? 'tomorrow' : DAY_NAMES[d]) + ' ' + timeLabel(hours.open) };
    }
  }
  return null;
}

export function hoursRows(branch) {
  const hours = branch && parseHours(branch.opening_hours);
  if (!hours) return [];
  const closed = DAY_NAMES.filter((_, i) => !hours.days.includes(i));
  const rows = [[hours.firstDay + ' to ' + hours.lastDay, timeLabel(hours.open) + ' – ' + timeLabel(hours.close)]];
  closed.forEach(day => rows.push([day, 'Closed']));
  return rows;
}

export function shortBranch(name) {
  return (name || '').replace(/^Beacon Mart\s*/i, '');
}

export function useReveal() {
  useEffect(() => {
    const pending = () => document.querySelectorAll('[data-reveal]:not(.is-in)');
    if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) {
      pending().forEach(el => el.classList.add('is-in'));
      return undefined;
    }
    const watched = new WeakSet();
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    const scan = () => pending().forEach(el => {
      if (!watched.has(el)) {
        watched.add(el);
        io.observe(el);
      }
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}

export function SiteHeader() {
  return (
    <header className="site-bar">
      <a href="/" className="wordmark">Beacon Mart</a>
      <nav className="bar-links">
        <a href="/">Shop</a>
        <a href="/stores">Stores</a>
        <a href="/my-orders">My orders</a>
      </nav>
      <a href="/" className="button button-accent bar-action">Order online</a>
    </header>
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
      <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C9.4 3 4 8.36 4 14.97c0 2.11.56 4.17 1.62 5.99L4 29l8.26-1.6a12.1 12.1 0 0 0 3.78.6C22.66 28 28 22.63 28 16.02 28 9.4 22.66 3 16.04 3Zm0 22.6c-1.2 0-2.38-.2-3.5-.6l-.25-.09-4.9.95.98-4.73-.16-.26a10.5 10.5 0 0 1-1.6-5.56c0-5.8 4.7-10.53 10.48-10.53 5.77 0 10.47 4.73 10.47 10.53-.01 5.58-4.7 10.3-10.52 10.3Zm5.75-7.8c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.15-.21.31-.82 1.02-1 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.56-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.61-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62 0 1.55 1.13 3.04 1.29 3.25.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.2 1.99.12.61-.09 1.86-.76 2.12-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37Z" />
      </svg>
    </a>
  );
}

const SCALLOPS = Array.from({ length: 12 }, (_, i) => `M${i * 100} 40 A50 40 0 0 1 ${i * 100 + 100} 40`).join(' ');

export function SiteFooter() {
  const settings = useShopSettings();
  const branches = useBranches();
  const wa = settings && settings.whatsapp_number;
  return (
    <footer className="site-footer">
      <div className="postcard" data-reveal>
        <svg className="scallops" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d={SCALLOPS + ' L1200 40 L0 40 Z'} />
        </svg>
        <div className="postcard-body">
          <div className="postcard-message">
            <h2>Jumpa lagi</h2>
            <p>
              Every order is packed by the branch you choose, and delivery is free from RM&nbsp;120 in KL
              and Selangor. Questions about an order? Send us a message on WhatsApp.
            </p>
            <nav className="postcard-links" aria-label="Information">
              <a href="/about">About us</a>
              <a href="/delivery-policy">Delivery</a>
              <a href="/refund-policy">Returns and refunds</a>
              <a href="/privacy-policy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/contact">Contact</a>
            </nav>
          </div>
          <div className="postcard-address">
            <img
              className="stamp"
              src={API + '/uploads/products/10_seed.webp'}
              alt="Beacon seaweed chicken drumettes"
              width="88"
              height="117"
              loading="lazy"
            />
            {wa && <a href={'https://wa.me/' + wa}>WhatsApp +{wa}</a>}
            {branches.map(b => (
              <a key={b.branch_id} href={'/?branch=' + b.branch_id}>{b.address}</a>
            ))}
            <a href="/stores">All our stores</a>
          </div>
        </div>
        <p className="imprint">
          © {new Date().getFullYear()} Beacon Mart. Klang River photograph by Slleong (CC0); fishing vessels at
          Lahad Datu by CEphoto, Uwe Aranas (CC BY-SA 3.0); both via Wikimedia Commons.
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }) {
  useReveal();
  return (
    <div className="site">
      <SiteHeader />
      <main className="page-content">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
