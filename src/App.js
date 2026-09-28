import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost/beaconmart-project/backend/products/get_products.php')
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          setProducts(result.data);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching products:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="App">
      <h1>Beacon Mart - Products</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '20px' }}>
        {products.map(product => (
          <div key={product.product_id} style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '16px',
            width: '250px'
          }}>
            <h3>{product.name}</h3>
            <p>Category: {product.category}</p>
            <p>Price: RM {product.price}</p>
            <p>Stock: {product.stock}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;