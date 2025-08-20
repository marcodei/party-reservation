(() => {
  const login = document.getElementById('login');
  const dash = document.getElementById('dash');
  const password = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const err = document.getElementById('err');

  const totalRes = document.getElementById('totalRes');
  const totalPeople = document.getElementById('totalPeople');
  const tbody = document.querySelector('#table tbody');

  let genderChart, paymentChart;

  loginBtn.addEventListener('click', async () => {
    err.textContent = '';
    const pwd = password.value.trim();
    if (!pwd) return;
    try {
      const res = await fetch('/api/admin/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ password: pwd })
      });
      if (!res.ok) throw new Error('bad');
      await res.json();
      login.hidden = true; dash.hidden = false;
      load();
    } catch(e){
      err.textContent = 'Password errata';
    }
  });

  async function load(){
    const res = await fetch('/api/admin/reservations');
    if (!res.ok) return;
    const data = await res.json();

    totalRes.textContent = data.length;
    totalPeople.textContent = data.reduce((acc,r)=>acc + (r.num_people||0), 0);

    // Aggregate gender
    const gTotals = {};
    data.forEach(r => {
      const g = r.gender_counts || {};
      for (const k of Object.keys(g)) {
        gTotals[k] = (gTotals[k]||0) + Number(g[k]||0);
      }
    });

    // Payment split
    const pTotals = { cash:0, bank:0 };
    data.forEach(r => {
      if (r.payment_method === 'cash') pTotals.cash++;
      if (r.payment_method === 'bank') pTotals.bank++;
    });

    drawCharts(gTotals, pTotals);
    fillTable(data);
  }

  function drawCharts(gTotals, pTotals){
    const gCtx = document.getElementById('genderChart');
    const pCtx = document.getElementById('paymentChart');

    if (genderChart) genderChart.destroy();
    genderChart = new Chart(gCtx, {
      type:'pie',
      data:{
        labels:Object.keys(gTotals),
        datasets:[{ data:Object.values(gTotals) }]
      },
      options:{ plugins:{ title:{ display:true, text:'Distribuzione Genere' }, legend:{ position:'bottom' } }, responsive:true }
    });

    if (paymentChart) paymentChart.destroy();
    paymentChart = new Chart(pCtx, {
      type:'pie',
      data:{
        labels:['Contanti','Bonifico'],
        datasets:[{ data:[pTotals.cash, pTotals.bank] }]
      },
      options:{ plugins:{ title:{ display:true, text:'Metodo di pagamento' }, legend:{ position:'bottom' } }, responsive:true }
    });
  }

  function fillTable(rows){
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const names = Array.isArray(r.names) ? r.names.join(', ') : '';
      const genders = r.gender_counts ? Object.entries(r.gender_counts).map(([k,v])=>k+': '+v).join(', ') : '';
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${new Date(r.created_at).toLocaleString()}</td>
        <td>${r.num_people}</td>
        <td>${names}</td>
        <td>${genders}</td>
        <td>${r.payment_method}</td>
        <td>${r.joined_whatsapp ? 'Sì' : 'No'}</td>
      `;
      tbody.appendChild(tr);
    });
  }
})();
