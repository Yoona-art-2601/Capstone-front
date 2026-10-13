import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost/beaconmart-project/backend';

function Transfers({ branchId, onChange }) {
  const [branches, setBranches] = useState([]);
  const [fromBranch, setFromBranch] = useState('');
  const [toBranch, setToBranch] = useState('');
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [message, setMessage] = useState('');
  const [transfers, setTransfers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(API + '/branches/get_branches.php', { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setBranches(result.data);
          if (result.data.length >= 2) {
            setFromBranch(result.data[0].branch_id);
            setToBranch(result.data[1].branch_id);
          }
        }
      })
      .catch(err => console.error('Error fetching branches:', err));
  }, []);


  const loadProducts = useCallback(() => {
    if (!fromBranch) return;
    fetch(API + '/products/get_products.php?branch_id=' + fromBranch, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setProducts(result.data);
      })
      .catch(err => console.error('Error fetching products:', err));
  }, [fromBranch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);


  const loadTransfers = useCallback(() => {
    const query = branchId === 'all' ? '' : '?branch_id=' + branchId;
    fetch(API + '/stock/get_transfers.php' + query, { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) setTransfers(result.data);
      })
      .catch(err => console.error('Error fetching transfers:', err));
  }, [branchId]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const branchName = (id) => {
    const b = branches.find(x => x.branch_id === id);
    return b ? b.branch_name : '';
  };

  const submitTransfer = async () => {
    const quantity = parseInt(qty, 10);

    if (!productId) {
      setMessage('Please select a product.');
      return;
    }
    if (fromBranch === toBranch) {
      setMessage('Source and destination branch must be different.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setMessage('Enter a quantity greater than 0.');
      return;
    }
    const selected = products.find(p => p.product_id === Number(productId));
    if (selected && quantity > Number(selected.stock)) {
      setMessage('Only ' + selected.stock + ' available at ' + branchName(fromBranch) + '.');
      return;
    }

    const ok = window.confirm(
      'Transfer ' + quantity + ' x ' + (selected ? selected.name : 'product') +
      ' from ' + branchName(fromBranch) + ' to ' + branchName(toBranch) + '?'
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(API + '/stock/transfer_stock.php', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(productId),
          from_branch_id: fromBranch,
          to_branch_id: toBranch,
          quantity: quantity
        })
      });
      const result = await res.json();
      if (result.success) {
        setMessage('Transferred ' + quantity + ' x ' + (selected ? selected.name : 'product') +
          ' from ' + branchName(fromBranch) + ' to ' + branchName(toBranch) + '.');
        setQty('');
        loadProducts();
        loadTransfers();
        if (onChange) onChange();
      } else {
        setMessage('Error: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      setMessage('Could not connect to the server.');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <div className="form-box">
        <h3>New stock transfer</h3>
        <div className="form-grid">
          <label>
            From branch
            <select value={fromBranch} onChange={(e) => { setFromBranch(Number(e.target.value)); setProductId(''); }}>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </label>

          <label>
            To branch
            <select value={toBranch} onChange={(e) => setToBranch(Number(e.target.value))}>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </label>

          <label>
            Product
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} (stock: {p.stock})
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input type="number" min="1" className="narrow" value={qty}
              onChange={(e) => setQty(e.target.value)} />
          </label>

          <button onClick={submitTransfer} disabled={submitting}>
            {submitting ? 'Transferring...' : 'Transfer'}
          </button>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <h3>Transfer history</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Product</th>
            <th>From</th>
            <th>To</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {transfers.length === 0 && (
            <tr><td colSpan="5">No transfers yet.</td></tr>
          )}
          {transfers.map(t => (
            <tr key={t.transfer_id}>
              <td>{t.transfer_date}</td>
              <td>{t.name}</td>
              <td>{t.from_branch_name}</td>
              <td>{t.to_branch_name}</td>
              <td>{t.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Transfers;