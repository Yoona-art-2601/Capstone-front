import { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API, rm } from './api';
import { formatDate } from './format';

function isoDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

function SalesHistory({ branchId }) {
  const [dateFrom, setDateFrom] = useState(daysAgo(29));
  const [dateTo, setDateTo] = useState(isoDate(new Date()));
  const [page, setPage] = useState(1);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const query = useCallback((extra) => {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, ...extra });
    if (branchId !== 'all') params.set('branch_id', branchId);
    return API + '/stats/sales_history.php?' + params;
  }, [dateFrom, dateTo, branchId]);

  useEffect(() => {
    fetch(query({ page }), { credentials: 'include' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setReport(result);
          setError('');
        } else {
          setError(result.message);
        }
      })
      .catch(() => setError('Could not load the sales history.'));
  }, [query, page]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, branchId]);

  const preset = (days) => {
    setDateFrom(daysAgo(days - 1));
    setDateTo(isoDate(new Date()));
  };

  const downloadCsv = async () => {
    setBusy('csv');
    try {
      const res = await fetch(query({ format: 'csv' }), { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beacon-mart-sales-' + dateFrom + '-to-' + dateTo + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Could not download the CSV file.');
    }
    setBusy('');
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    try {
      const result = await fetch(query({ all: 1 }), { credentials: 'include' }).then(res => res.json());
      if (!result.success) throw new Error(result.message);

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const width = doc.internal.pageSize.getWidth();
      doc.setFillColor(29, 58, 42);
      doc.rect(0, 0, width, 70, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Beacon Mart Sales Report', 40, 42);
      doc.setFontSize(10);
      doc.text('Generated ' + new Date().toLocaleString('en-MY'), width - 40, 42, { align: 'right' });

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.text('Branch: ' + result.branch_name, 40, 100);
      doc.text('Period: ' + result.date_from + ' to ' + result.date_to, 40, 118);

      autoTable(doc, {
        startY: 136,
        theme: 'grid',
        head: [['Paid orders', 'Units sold', 'Products sold', 'Revenue (before SST & delivery)']],
        body: [[result.totals.orders, result.totals.units, result.totals.products, rm(result.totals.revenue)]],
        headStyles: { fillColor: [45, 106, 69] },
        styles: { fontSize: 10, halign: 'center' }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['#', 'Product', 'Category', 'Units', 'Orders', 'Revenue', 'Share']],
        body: result.data.length
          ? result.data.map((r, i) => [i + 1, r.name, r.category || '-', r.units, r.orders, rm(r.revenue), r.share + '%'])
          : [['', 'No paid sales in this period', '', '', '', '', '']],
        headStyles: { fillColor: [45, 106, 69] },
        alternateRowStyles: { fillColor: [242, 248, 244] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 24 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
        didDrawPage: () => {
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text('Beacon Mart - paid, non-cancelled orders only', 40, doc.internal.pageSize.getHeight() - 20);
          doc.text('Page ' + doc.internal.getNumberOfPages(), width - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
        }
      });

      doc.save('beacon-mart-sales-' + result.date_from + '-to-' + result.date_to + '.pdf');
    } catch (err) {
      setError('Could not create the PDF report.');
    }
    setBusy('');
  };

  return (
    <div className="panel sales-history">
      <div className="sales-history-head">
        <h3>Sales history</h3>
        <div className="sales-history-actions">
          <button onClick={downloadCsv} disabled={!!busy}>{busy === 'csv' ? 'Preparing...' : 'Download CSV'}</button>
          <button onClick={downloadPdf} disabled={!!busy}>{busy === 'pdf' ? 'Preparing...' : 'Download PDF'}</button>
        </div>
      </div>

      <div className="toolbar sales-history-filters">
        <label>From <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label>To <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} /></label>
        <button onClick={() => preset(7)}>Last 7 days</button>
        <button onClick={() => preset(30)}>Last 30 days</button>
        <button onClick={() => preset(90)}>Last 90 days</button>
      </div>

      {error && <div className="notice alert">{error}</div>}

      {report && (
        <>
          <div className="cards">
            <div className="card"><div className="label">Paid orders</div><div className="value">{report.totals.orders}</div></div>
            <div className="card"><div className="label">Units sold</div><div className="value">{report.totals.units}</div></div>
            <div className="card"><div className="label">Revenue</div><div className="value">{rm(report.totals.revenue)}</div><div className="sub">before SST and delivery</div></div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Category</th>
                <th>Units sold</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Share</th>
                <th>Last sale</th>
              </tr>
            </thead>
            <tbody>
              {report.data.length === 0 && <tr><td colSpan="8">No paid sales in this period.</td></tr>}
              {report.data.map((r, i) => (
                <tr key={r.product_id}>
                  <td>{(report.page - 1) * 10 + i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.category}</td>
                  <td>{r.units}</td>
                  <td>{r.orders}</td>
                  <td>{rm(r.revenue)}</td>
                  <td>
                    <div className="share-bar"><span style={{ width: r.share + '%' }} /></div>
                    <small>{r.share}%</small>
                  </td>
                  <td className="nowrap">{formatDate(r.last_sale)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {report.pages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>&larr; Prev</button>
              <span>Page {report.page} of {report.pages}</span>
              <button disabled={page >= report.pages} onClick={() => setPage(page + 1)}>Next &rarr;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SalesHistory;
