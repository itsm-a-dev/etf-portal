const API_BASE = 'YOUR_RAILWAY_API_URL';

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
