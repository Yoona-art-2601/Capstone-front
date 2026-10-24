import { useState, useEffect, useCallback, useRef } from 'react';
import { API } from './api';

function timeAgo(value) {
  const then = new Date(value.replace(' ', 'T')).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + ' min ago';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + ' h ago';
  return Math.round(hours / 24) + ' d ago';
}

const SCOPES = {
  store: { scope: 'customer', title: 'My notifications', empty: 'No notifications yet. Updates about your orders and items you asked us to restock will appear here.' },
  admin: { scope: 'admin', title: 'Admin alerts', empty: 'No alerts. New orders, cancellations, refunds and low stock will appear here.' }
};

function NotificationBell({ onOpenLink, variant = 'store' }) {
  const { scope, title, empty } = SCOPES[variant] || SCOPES.store;
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(() => {
    fetch(API + '/notifications/get_notifications.php?scope=' + scope, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setItems(result.data);
          setUnread(result.unread);
        }
      })
      .catch(() => {});
  }, [scope]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = (body) =>
    fetch(API + '/notifications/mark_read.php', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, scope })
    }).then(load);

  const openItem = (item) => {
    const go = () => {
      setOpen(false);
      if (!item.link) return;
      if (onOpenLink) onOpenLink(item.link);
      else window.location.href = item.link;
    };
    if (Number(item.is_read) === 0) markRead({ notification_id: item.notification_id }).finally(go);
    else go();
  };

  return (
    <div className={'notif notif-' + variant} ref={boxRef}>
      <button
        className="notif-button"
        onClick={() => { setOpen(!open); if (!open) load(); }}
        aria-label={title + (unread ? ', ' + unread + ' unread' : '')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notif-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>{title}</strong>
            {unread > 0 && <button className="notif-markall" onClick={() => markRead({ all: true })}>Mark all as read</button>}
          </div>
          {items.length === 0 ? (
            <p className="notif-empty">{empty}</p>
          ) : (
            <ul>
              {items.map(item => (
                <li key={item.notification_id}>
                  <button className={'notif-item' + (Number(item.is_read) === 0 ? ' unread' : '')} onClick={() => openItem(item)}>
                    <span className={'notif-dot ' + item.type} />
                    <span className="notif-text">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      <small>{timeAgo(item.created_at)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
