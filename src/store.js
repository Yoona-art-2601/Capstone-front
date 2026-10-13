import { useState, useEffect } from 'react';
import './App.css';

const API = 'http://localhost/beaconmart-project/backend';

function Store() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(1);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // after payment redirect, show success or cancelled message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      setMessage('Payment successful! Order #' + params.get('order_id') + ' has been placed.');
    } else if (payment === 'cancelled') {
      setMessage('Payment cancelled. Your order was not placed.');
    }
    if (payment) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // load branches on mount
  useEffect(() => {
    fetch(API + '/branches/get_branches.php')
      .then(res => res.json())
      .then(result => {
        if (result.success) setBranches(result.data);
      })
      .catch(err => console.error('Error fetching branches:', err));
  }, []);

  // when branch changes: reload products for that branch and clear cart (inventory is branch-specific)
  useEffect(() => {
    setCart([]);
    fetch(API + '/products/get_products.php?branch_id=' + branchId)
      .then(res => res.json())
      .then(result => {
        if (result.success) setProducts(result.data);
      })
      .catch(err => console.error('Error fetching products:', err));
  }, [branchId]);

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.product_id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= product.stock) {
      setMessage('Only ' + product.stock + ' of ' + product.name + ' available at this branch.');
      return;
    }
    setMessage('');
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

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (!customerName.trim()) {
      setMessage('Please enter your name.');
      return;
    }
    if (cart.length === 0) {
      setMessage('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    fetch(API + '/payment/create_checkout_session.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id: branchId,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          // redirect to Stripe checkout page
          window.location.href = result.checkout_url;
        } else {
          setMessage('Error: ' + result.message);
          setSubmitting(false);
        }
      })
      .catch(err => {
        console.error(err);
        setMessage('Could not connect to the server.');
        setSubmitting(false);
      });
  };

  return (
    <div className="App" style={{ padding: '20px' }}>
      <h1>Beacon Mart</h1>

      <div style={{ marginBottom: '20px' }}>
        <label><strong>Select branch: </strong></label>
        <select value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
          {branches.map(b => (
            <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
          ))}
        </select>
      </div>

      {message && (
        <p style={{ padding: '10px', background: '#eef3ff', borderRadius: '6px' }}>{message}</p>
      )}

      <div style={{ display: 'flex', gap: '30px' }}>
        <div style={{ flex: 2 }}>
          <h2>Products</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {products.map(product => (
              <div key={product.product_id} style={{
                border: '1px solid #ccc', borderRadius: '8px', padding: '16px', width: '220px'
              }}>
                <h3>{product.name}</h3>
                <p>Category: {product.category}</p>
                <p>Price: RM {Number(product.price).toFixed(2)}</p>
                <p>Stock: {product.stock}</p>
                <button onClick={() => addToCart(product)} disabled={product.stock <= 0}>
                  {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '16px', height: 'fit-content' }}>
          <h2>Cart</h2>
          {cart.length === 0 ? (
            <p>Cart is empty.</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.product_id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                  <p><strong>{item.name}</strong></p>
                  <p>{item.quantity} × RM {Number(item.price).toFixed(2)} = RM {(item.quantity * item.price).toFixed(2)}</p>
                  <button onClick={() => removeFromCart(item.product_id)}>Remove</button>
                </div>
              ))}
              <p><strong>Total: RM {cartTotal.toFixed(2)}</strong></p>
              <hr />
              <input
                type="text" placeholder="Your Name" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ display: 'block', marginBottom: '8px', width: '100%' }}
              />
              <input
                type="text" placeholder="Phone Number" value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ display: 'block', marginBottom: '8px', width: '100%' }}
              />
              <button onClick={handleCheckout} disabled={submitting}>
                {submitting ? 'Redirecting to payment...' : 'Pay with Stripe'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Store;