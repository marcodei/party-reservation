(() => {
  const steps = [...document.querySelectorAll('.step')];
  const startBtn = document.getElementById('startBtn');
  const reservationForm = document.getElementById('reservationForm');
  const whatsLink = document.getElementById('whatsLink');
  const joinedBtn = document.getElementById('joinedBtn');
  const confirmTransfer = document.getElementById('confirmTransfer');
  const ibanValue = document.getElementById('ibanValue');

  const paymentButtonsContainer = document.getElementById('step-4');
  let paymentMethod = null;

  const data = {
    num_people: 0,
    names: [],
    gender_counts: { M:0, F:0, X:0 },
    payment_method: null,
    joined_whatsapp: false
  };

  const show = (n) => steps.forEach((s,i)=> s.classList.toggle('active', i===n-1));

  startBtn.addEventListener('click', () => show(2));

  reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = parseInt(document.getElementById('numPeople').value || '0', 10);
    const namesRaw = (document.getElementById('names').value || '').split('\n').map(v=>v.trim()).filter(Boolean);
    const male = parseInt(document.getElementById('maleCount').value || '0', 10);
    const female = parseInt(document.getElementById('femaleCount').value || '0', 10);
    const other = parseInt(document.getElementById('otherCount').value || '0', 10);

    if (num < 1) return alert('Inserisci un numero valido di persone');
    if (namesRaw.length !== num) return alert('Il numero dei nominativi non corrisponde');
    if ((male + female + other) !== num) return alert('La somma M/F/Altro deve coincidere con il totale');

    data.num_people = num;
    data.names = namesRaw;
    data.gender_counts = { M: male, F: female, X: other };

    try {
      const res = await fetch('/api/whatsapp');
      const j = await res.json();
      whatsLink.href = j.link || '#';
    } catch(e){ /* ignore */ }

    show(3);
  });

  joinedBtn.addEventListener('click', () => {
    data.joined_whatsapp = true;
    show(4);
  });

  paymentButtonsContainer.querySelectorAll('button[data-method]').forEach(btn => {
    btn.addEventListener('click', async () => {
      paymentMethod = btn.dataset.method;
      data.payment_method = paymentMethod;

      if (paymentMethod === 'bank') {
        try {
          const r = await fetch('/api/iban'); const j = await r.json();
          ibanValue.textContent = j.iban || '—';
        } catch(e){ ibanValue.textContent = '—'; }
        show(5);
      } else {
        save();
      }
    });
  });

  confirmTransfer.addEventListener('click', () => save());

  async function save(){
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error('Errore salvataggio');
      show(6);
    } catch(e){
      alert('Si è verificato un errore, riprova.');
    }
  }

  // start at step 1
  show(1);
})();
