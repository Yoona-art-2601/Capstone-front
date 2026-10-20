import { useState } from 'react';

export function Stars({ value, size = 'sm' }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className={'stars stars-' + size} aria-label={Number(value).toFixed(1) + ' out of 5 stars'}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= rounded ? 'on' : 'off'} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  const shown = hover || value;
  return (
    <div className="star-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          type="button"
          key={n}
          className={n <= shown ? 'on' : 'off'}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={n + ' star' + (n > 1 ? 's' : '')}
          aria-pressed={value === n}
        >
          ★
        </button>
      ))}
      <span className="star-input-label">{labels[shown]}</span>
    </div>
  );
}
