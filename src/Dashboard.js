import { useState, useEffect, useMemo, useRef } from 'react';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API = 'http://localhost/beaconmart-project/backend';

const rm = (value) => 'RM ' + Number(value).toFixed(2);

function getJSON(path) {
  return fetch(API + path, { credentials: 'include' }).then(res => res.json());
}

function BarChart({ labels, values, label, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: label, data: values, backgroundColor: color, borderRadius: 4 }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'RM' } } }
      }
    });
    return () => chart.destroy();
  }, [labels, values, label, color]);

  return <canvas ref={canvasRef}></canvas>;
}

function Dashboard({ branchId }) {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState(null);
  const [dash, setDash] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const branchQuery = branchId === 'all' ? '' : 'branch_id=' + branchId;
    const url = (path, extra) => {
      const parts = [branchQuery, extra].filter(Boolean).join('&');
      return path + (parts ? '?' + parts : '');
    };

    setError('');
    Promise.all([
      getJSON(url('/stats/sales_summary.php')),
      getJSON(url('/stats/dashboard.php', 'days=' + days)),
      getJSON(url('/stats/top_products.php')),
      getJSON(url('/stock/get_low_stock.php'))
    ])
      .then(([s, d, t, l]) => {
        if (s.success) setSummary(s.data);
        if (d.success) setDash(d.data);
        if (t.success) setTopProducts(t.data);
        if (l.success) setLowStock(l.data);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load dashboard data.');
      });
  }, [branchId, days]);

  const dailyLabels = useMemo(() => (dash ? dash.daily_sales.map(r => r.date.slice(5)) : []), [dash]);
  const dailyValues = useMemo(() => (dash ? dash.daily_sales.map(r => Number(r.total)) : []), [dash]);
  const branchLabels = useMemo(() => (dash ? dash.sales_by_branch.map(r => r.branch_name) : []), [dash]);
  const branchValues = useMemo(() => (dash ? dash.sales_by_branch.map(r => Number(r.revenue)) : []), [dash]);

  return (
    <div>
      {error && <div className="notice alert">{error}</div>}

      {summary && (
        <div className="cards">
          <div className="card">
            <div className="label">Today</div>
            <div className="value">{rm(summary.today.total_sales)}</div>
            <div className="sub">{summary.today.order_count} order(s)</div>
          </div>
          <div className="card">
            <div className="label">This week</div>
            <div className="value">{rm(summary.this_week.total_sales)}</div>
            <div className="sub">{summary.this_week.order_count} order(s)</div>
          </div>
          <div className="card">
            <div className="label">This month</div>
            <div className="value">{rm(summary.this_month.total_sales)}</div>
            <div className="sub">{summary.this_month.order_count} order(s)</div>
          </div>
        </div>
      )}

      {dash && (
        <>
          <div className="chart-grid">
            <div className="panel">
              <div className="toolbar">
                <h3 style={{ margin: 0 }}>Daily sales</h3>
                <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </div>
              <BarChart labels={dailyLabels} values={dailyValues} label="Revenue (RM)" color="rgba(103, 114, 229, 0.75)" />
            </div>

            <div className="panel">
              <h3>Sales by branch (all time)</h3>
              <BarChart labels={branchLabels} values={branchValues} label="Revenue (RM)" color="rgba(40, 167, 69, 0.75)" />
            </div>
          </div>

          <div className="panel">
            <h3>Stock summary</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Products</th>
                  <th>Total units in stock</th>
                  <th>Low-stock items</th>
                </tr>
              </thead>
              <tbody>
                {dash.stock_summary.map(row => (
                  <tr key={row.branch_name}>
                    <td>{row.branch_name}</td>
                    <td>{row.products}</td>
                    <td>{row.total_units}</td>
                    <td>
                      {Number(row.low_stock_items) > 0
                        ? <span className="pill cancelled">{row.low_stock_items}</span>
                        : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="panel">
        <h3>Best sellers</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Units sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 && (
              <tr><td colSpan="4">No sales yet.</td></tr>
            )}
            {topProducts.map(p => (
              <tr key={p.product_id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.total_sold}</td>
                <td>{rm(p.total_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Low-stock items</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Product</th>
              <th>Stock</th>
              <th>Low-stock at</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.length === 0 && (
              <tr><td colSpan="4">No low-stock items.</td></tr>
            )}
            {lowStock.map(item => (
              <tr key={item.branch_id + '-' + item.product_id}>
                <td>{item.branch_name}</td>
                <td>{item.name}</td>
                <td>{item.stock}</td>
                <td>{item.low_stock_threshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;