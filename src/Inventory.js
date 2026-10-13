import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost/beaconmart-project/backend';

function post(path, body) {
  return fetch(API + path, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(res => res.json());
}

function ProductRow({ product, branchId, onDone }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [adjType, setAdjType] = useState('Restock');
  const [adjQty, setAdjQty] = useState('');

  const isLow = Number(product.stock) <= Number(product.low_stock_threshold);

  const startEdit = () => {
    setForm({
      name: product.name,
      category: product.category || '',
      price: product.price,
      low_stock_threshold: product.low_stock_threshold
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!form.name.trim()) {
      onDone('Product name cannot be empty.');
      return;
    }
    try {
      const r1 = await post('/products/update_product.php', {
        product_id: product.product_id,
        name: form.name,
        category: form.category,
        price: form.price
      });
      if (!r1.success) {
        onDone('Error: ' + r1.message);
        return;
      }
      const r2 = await post('/stock/update_threshold.php', {
        branch_id: branchId,
        product_id: product.product_id,
        low_stock_threshold: form.low_stock_threshold
      });
      if (!r2.success) {
        onDone('Error: ' + r2.message);
        return;
      }
      setEditing(false);
      onDone('Saved "' + form.name + '".');
    } catch (err) {
      console.error(err);
      onDone('Could not connect to the server.');
    }
  };

  const applyAdjust = async () => {
    const qty = parseInt(adjQty, 10);
    if (!qty) {
      onDone('Enter a quantity (a whole number, not 0).');
      return;
    }
    if (adjType !== 'Adjustment' && qty < 0) {
      onDone('For Stock In / Stock Out, enter a positive quantity.');
      return;
    }
    const change = adjType === 'Stock Out' ? -qty : qty;

    try {
      const result = await post('/stock/update_stock.php', {
        branch_id: branchId,
        product_id: product.product_id,
        quantity_change: change,
        change_type: adjType
      });
      setAdjQty('');
      onDone(result.success
        ? adjType + ' recorded for "' + product.name + '".'
        : 'Error: ' + result.message);
    } catch (err) {
      console.error(err);
      onDone('Could not connect to the server.');
    }
  };

  const removeProduct = async () => {
    const ok = window.confirm(
      'Remove "' + product.name + '" from the store? It will no longer be sold at any branch. Past orders are kept.'
    );
    if (!ok) return;
    try {
      const result = await post('/products/delete_product.php', { product_id: product.product_id });
      onDone(result.success ? '"' + product.name + '" removed from the store.' : 'Error: ' + result.message);
    } catch (err) {
      console.error(err);
      onDone('Could not connect to the server.');
    }
  };

  return (
    <tr className={isLow ? 'low-row' : ''}>
      <td>
        {editing ? (
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        ) : product.name}
      </td>
      <td>
        {editing ? (
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        ) : product.category}
      </td>
      <td>
        {editing ? (
          <input type="number" step="0.01" min="0" className="narrow" value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })} />
        ) : Number(product.price).toFixed(2)}
      </td>
      <td>
        {product.stock} {isLow && <span className="pill cancelled">Low</span>}
      </td>
      <td>
        {editing ? (
          <input type="number" min="0" className="narrow" value={form.low_stock_threshold}
            onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
        ) : product.low_stock_threshold}
      </td>
      <td>
        <select value={adjType} onChange={(e) => setAdjType(e.target.value)}>
          <option value="Restock">Stock In</option>
          <option value="Stock Out">Stock Out</option>
          <option value="Adjustment">Adjustment (+/-)</option>
        </select>{' '}
        <input type="number" className="narrow" placeholder="Qty" value={adjQty}
          onChange={(e) => setAdjQty(e.target.value)} />{' '}
        <button onClick={applyAdjust}>Apply</button>
      </td>
      <td>
        {editing ? (
          <>
            <button onClick={saveEdit}>Save</button>{' '}
            <button onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={startEdit}>Edit</button>{' '}
            <button className="danger" onClick={removeProduct}>Remove</button>
          </>
        )}
      </td>
    </tr>
  );
}

function Inventory({ branchId, onChange }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', price: '', initial_stock: '0', low_stock_threshold: '10'
  });

  const loadProducts = useCallback((showSpinner = true) => {
    if (branchId === 'all') return;
    if (showSpinner) setLoading(true);
    fetch(API + '/products/get_products.php?branch_id=' + branchId, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setProducts(result.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setMessage('Could not load products.');
        setLoading(false);
      });
  }, [branchId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDone = (msg) => {
    setMessage(msg);
    loadProducts(false);
    if (onChange) onChange();
  };

  const addProduct = async () => {
    if (!newProduct.name.trim() || newProduct.price === '') {
      setMessage('Please enter a product name and price.');
      return;
    }
    try {
      const result = await post('/products/add_product.php', {
        name: newProduct.name,
        category: newProduct.category,
        price: newProduct.price,
        initial_stock: Number(newProduct.initial_stock) || 0,
        low_stock_threshold: Number(newProduct.low_stock_threshold) || 0
      });
      if (result.success) {
        setNewProduct({ name: '', category: '', price: '', initial_stock: '0', low_stock_threshold: '10' });
        setShowAdd(false);
        handleDone('Product "' + newProduct.name + '" added to all branches.');
      } else {
        setMessage('Error: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      setMessage('Could not connect to the server.');
    }
  };

  if (branchId === 'all') {
    return <div className="notice">Please select a branch at the top to manage its inventory.</div>;
  }

  const lowCount = products.filter(p => Number(p.stock) <= Number(p.low_stock_threshold)).length;

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Close' : '+ Add product'}</button>
        <button onClick={loadProducts}>Refresh</button>
        <span>{products.length} product(s)</span>
      </div>

      {lowCount > 0 && (
        <div className="notice alert">
          {lowCount} product(s) at or below the low-stock threshold. Please restock.
        </div>
      )}

      {message && <div className="notice">{message}</div>}

      {showAdd && (
        <div className="form-box">
          <h3>New product</h3>
          <div className="form-grid">
            <input placeholder="Name" value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
            <input placeholder="Category" value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
            <input type="number" step="0.01" min="0" placeholder="Price (RM)" value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
            <input type="number" min="0" placeholder="Initial stock" value={newProduct.initial_stock}
              onChange={(e) => setNewProduct({ ...newProduct, initial_stock: e.target.value })} />
            <input type="number" min="0" placeholder="Low-stock threshold" value={newProduct.low_stock_threshold}
              onChange={(e) => setNewProduct({ ...newProduct, low_stock_threshold: e.target.value })} />
            <button onClick={addProduct}>Save product</button>
          </div>
          <small>Initial stock and threshold are applied to every branch. Adjust each branch afterwards.</small>
        </div>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price (RM)</th>
              <th>Stock</th>
              <th>Low-stock at</th>
              <th>Stock in / out</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan="7">No products.</td></tr>
            )}
            {products.map(product => (
              <ProductRow
                key={product.product_id}
                product={product}
                branchId={branchId}
                onDone={handleDone}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Inventory;