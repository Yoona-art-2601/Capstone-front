import { useState, useEffect } from 'react';

const API = 'http://localhost/beaconmart-project/backend';

const rm = (value) => 'RM ' + Number(value).toFixed(2);

export function productImageUrl(product) {
  return product && product.image_url ? API + '/' + product.image_url : null;
}

function ProductModal({ product, branch, inCartQty, onAdd, onClose }) {
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
    <div className="dialog-layer" onClick={onClose}>
      <div className="product-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={product.name}>
        <div className="product-dialog-image">
          {image && <img src={image} alt={product.name} width="640" height="640" />}
        </div>
        <div className="product-dialog-body">
          <button className="dialog-close text-button" onClick={onClose}>Close</button>
          <p className="product-dialog-cat">{product.category}</p>
          <h2>{product.name}</h2>
          <p className="product-dialog-price">
            {rm(product.unit_price)}
            {product.on_sale && <s>{rm(product.price)}</s>}
          </p>
          <p className="product-dialog-stock">
            {product.stock > 0 ? product.stock + ' on the shelf at ' + branch + '.' : 'Sold out at ' + branch + '.'}
            {Number(product.sold) > 0 && <> {product.sold} sold so far.</>}
            {product.on_sale && <> {product.discount_percent}% off this month.</>}
          </p>
          {product.description && <p className="product-dialog-desc">{product.description}</p>}

          {product.stock > 0 && (
            <div className="product-dialog-actions">
              <div className="qty qty-large">
                <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="One less">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} aria-label="One more">+</button>
              </div>
              <button className="button button-accent" onClick={add} disabled={maxQty <= 0}>
                {maxQty <= 0 ? 'All of it is in your cart' : 'Add to cart, ' + rm(product.unit_price * qty)}
              </button>
            </div>
          )}
          {inCartQty > 0 && <p className="product-dialog-incart">{inCartQty} already in your cart.</p>}
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
