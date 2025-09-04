const API_BASE = 'https://etf-portal-production.up.railway.app';

async function loadTable() {
  try {
    const res = await fetch(`${API_BASE}/etfs`);
    if (!res.ok) {
      throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
    }

    const { columns, rows } = await res.json();

    // Populate table headers
    const theadRow = document.querySelector('#etf thead tr');
    theadRow.innerHTML = '';
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      theadRow.appendChild(th);
    });

    // Populate table body
    const tbody = document.querySelector('#etf tbody');
    tbody.innerHTML = '';
    rows.forEach(row => {
      const tr = document.createElement('tr');
      columns.forEach(col => {
        const td = document.createElement('td');
        td.textContent = row[col] ?? '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Initialize DataTables after DOM is updated
    $('#etf').DataTable({
      pageLength: 25,
      order: [], // no initial sort
      responsive: true
    });

  } catch (err) {
    console.error('Error loading table:', err);
    const tbody = document.querySelector('#etf tbody');
    tbody.innerHTML = `<tr><td colspan="100%">Error loading data</td></tr>`;
  }
}

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', loadTable);
