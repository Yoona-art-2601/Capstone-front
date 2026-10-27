const LOCALE = 'en-MY';

function parse(value) {
  if (!value) return null;
  const text = String(value);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? text + 'T00:00:00' : text.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

const time = (d) => d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });

export function formatDate(value) {
  const d = parse(value);
  return d ? d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export function formatDateTime(value) {
  const d = parse(value);
  return d ? formatDate(value) + ', ' + time(d) : '';
}

export function formatShortDateTime(value) {
  const d = parse(value);
  return d ? d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }) + ', ' + time(d) : '';
}

export function formatSlot(date, slot) {
  const d = parse(date);
  if (!d) return '';
  const day = d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
  return slot ? day + ', ' + slot.replace('-', ' – ') : day;
}
