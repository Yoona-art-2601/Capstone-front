import { useState, useEffect } from 'react';

const API = 'http://localhost/beaconmart-project/backend';

const rm = (value) => 'RM ' + Number(value).toFixed(2);

export function productImageUrl(product) {
  return product.image_url ? API + '/' + product.image_url : null;
}

function ProductModal({ product, icon, inCartQty, onAdd, onClose }) {
  const [qty, setQty] = useState(1);
  const maxQty = Math.max(0, product.stock - inCartQty);
  const image = productImageUrl(product);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const add = () => {
    onAdd(product, qty);
    onClose();
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={product.name}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-image">
          {image ? <img src={image} alt={product.name} /> : <span>{icon}</span>}
          {product.on_sale && <span className="sale-badge">-{product.discount_percent}%</span>}
        </div>
        <div className="modal-body">
          <span className="product-category">{product.category}</span>
          <h2>{product.name}</h2>
          <div className="modal-meta">
            {Number(product.sold) > 0 && <span>{product.sold} sold</span>}
            <span className={product.stock > 0 ? 'in' : 'out'}>
              {product.stock > 0 ? product.stock + ' in stock at this branch' : 'Out of stock at this branch'}
            </span>
          </div>
          <div className="price-block modal-price">
            <span className={'price' + (product.on_sale ? ' sale' : '')}>{rm(product.unit_price)}</span>
            {product.on_sale && <span className="price-old">{rm(product.price)}</span>}
          </div>
          {product.description && <p className="modal-description">{product.description}</p>}

          {product.stock > 0 && (
            <div className="modal-actions">
              <div className="qty qty-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Decrease">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} aria-label="Increase">+</button>
              </div>
              <button className="btn btn-primary modal-add" onClick={add} disabled={maxQty <= 0}>
                {maxQty <= 0 ? 'All stock is in your cart' : 'Add to cart · ' + rm(product.unit_price * qty)}
              </button>
            </div>
          )}
          {inCartQty > 0 && <span className="in-cart">✓ {inCartQty} already in cart</span>}
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
