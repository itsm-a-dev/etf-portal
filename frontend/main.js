const API_BASE = 'etf-portal-production.up.railway.app';

async function loadTable() {
  const res = await fetch(`${API_BASE}/etfs`);
  const { columns, rows } = await res.json();
  const thead = document.querySelector('#etf thead tr');
  thead.innerHTML = '';
  columns.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    thead.appendChild(th);
  });

