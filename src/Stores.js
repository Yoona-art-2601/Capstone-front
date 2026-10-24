import { useState, useEffect } from 'react';
import { PageShell } from './Layout';
import { API } from './api';

function Stores() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API + '/branches/get_branches.php')
      .then(res => res.json())
      .then(result => {
        if (result.success) setBranches(result.data);
      })
      .catch(err => console.error('Error fetching branches:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <h1>Where to Find Us</h1>
      <p className="page-lead">
        Visit any of our outlets, or order online and choose the branch nearest to you.
      </p>

      {loading && <p className="message">Loading...</p>}

      <div className="store-list">
        {branches.map(b => (
          <div key={b.branch_id} className="store-card">
            <div className="store-card-icon">🏪</div>
            <div className="store-card-body">
              <h2>{b.branch_name}</h2>
              <p>📍 {b.address}</p>
              {b.opening_hours && <p>🕗 {b.opening_hours}</p>}
              {b.phone && <p>📞 <a href={'tel:' + b.phone.replace(/[^0-9+]/g, '')}>{b.phone}</a></p>}
              <div className="store-card-actions">
                <a
                  className="btn btn-ghost btn-sm"
                  href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions
                </a>
                <a className="btn btn-primary btn-sm" href={'/?branch=' + b.branch_id}>Shop this branch</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export default Stores;
