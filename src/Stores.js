import { PageShell, useBranches, branchStatus, hoursRows, shortBranch } from './Layout';

function Stores() {
  const branches = useBranches();

  return (
    <PageShell>
      <h1 className="page-title" data-reveal>Where to find us</h1>
      <p className="page-lead" data-reveal>
        Walk in, or order online and the branch you pick packs it for you.
      </p>

      <div className="branch-list">
        {branches.map(b => {
          const status = branchStatus(b);
          return (
            <article key={b.branch_id} className="branch" data-reveal>
              <div className="branch-name">
                <h2>{shortBranch(b.branch_name)}</h2>
                {status && <p className={'branch-status' + (status.open ? ' is-open' : '')}>{status.text.charAt(0).toUpperCase() + status.text.slice(1)}.</p>}
              </div>
              <div className="branch-detail">
                <p className="branch-address">{b.address}</p>
                <dl className="visit-hours">
                  {hoursRows(b).map(([day, time]) => (
                    <div key={day}><dt>{day}</dt><dd>{time}</dd></div>
                  ))}
                </dl>
                {b.phone && <a className="visit-phone" href={'tel:' + b.phone.replace(/[^0-9+]/g, '')}>{b.phone}</a>}
              </div>
              <div className="branch-actions">
                <a className="button button-accent" href={'/?branch=' + b.branch_id}>Shop this branch</a>
                <a
                  className="text-link"
                  href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <figure className="branch-figure" data-reveal>
        <img
          src="/assets/klang-river-6.jpg"
          alt="The Klang River at sunset, with grass banks and apartment blocks"
          width="1920"
          height="1080"
          loading="lazy"
        />
        <figcaption>The Klang River at Puchong Jaya. Photograph by Slleong, CC0.</figcaption>
      </figure>
    </PageShell>
  );
}

export default Stores;
