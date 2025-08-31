'use strict';

/** Stato di gioco */
const state = {
  N: 0, // quadrati per lato
  current: 0, // 0: P1, 1: P2
  players: [
    { letter: '', color: '#00e5ff', score: 0 },
    { letter: '', color: '#ff3df7', score: 0 }
  ],
};

const els = {
  config: document.getElementById('config'),
  gridSize: document.getElementById('gridSize'),
  p1Letter: document.getElementById('p1Letter'),
  p1Color: document.getElementById('p1Color'),
  p2Letter: document.getElementById('p2Letter'),
  p2Color: document.getElementById('p2Color'),
  startBtn: document.getElementById('startBtn'),

  gameArea: document.getElementById('gameArea'),
  board: document.getElementById('board'),
  turnIndicator: document.getElementById('turnIndicator'),
  turnWho: document.getElementById('turnWho'),
  scoreBtn: document.getElementById('scoreBtn'),
  newBtn: document.getElementById('newBtn'),

  scoreModal: document.getElementById('scoreModal'),
  scoreContent: document.getElementById('scoreContent'),
  closeScore: document.getElementById('closeScore'),
};

/** Utils */
const clamp = (min, v, max) => Math.max(min, Math.min(v, max));
const uc1 = (s) => (s || '').trim().slice(0,1).toUpperCase();

/** Setup eventi UI */
els.startBtn.addEventListener('click', startGame);
els.scoreBtn.addEventListener('click', showScore);
els.closeScore.addEventListener('click', () => els.scoreModal.close());
els.newBtn.addEventListener('click', resetToConfig);

/** Avvia nuova partita */
function startGame(){
  const N = clamp(1, parseInt(els.gridSize.value, 10) || 4, 10);
  state.N = N;

  state.players[0].letter = uc1(els.p1Letter.value);
  state.players[0].color  = els.p1Color.value || '#00e5ff';
  state.players[1].letter = uc1(els.p2Letter.value);
  state.players[1].color  = els.p2Color.value || '#ff3df7';
  state.players[0].score = 0;
  state.players[1].score = 0;
  state.current = 0;

  buildBoard(N);

  els.config.hidden = true;
  els.gameArea.hidden = false;
  updateTurnUI();
}

/** Ricostruisce la board come griglia (2N+1)x(2N+1) */
function buildBoard(N){
  const R = 2*N + 1;
  els.board.innerHTML = ''; // reset
  els.board.style.gridTemplateColumns = `repeat(${R}, 1fr)`;
  els.board.style.gridTemplateRows = `repeat(${R}, 1fr)`;

  for (let r = 0; r < R; r++){
    for (let c = 0; c < R; c++){
      const cell = document.createElement('div');

      if (r % 2 === 0 && c % 2 === 0){
        // Punto
        cell.className = 'dot';
        cell.setAttribute('role','presentation');

      } else if (r % 2 === 0 && c % 2 === 1){
        // Linea orizzontale: row: 0..N, col: 0..N-1
        const row = r/2;
        const col = (c-1)/2;
        cell.className = 'h-line';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute('aria-label', `Linea orizzontale r${row} c${col}`);
        cell.addEventListener('click', onLineClick, { passive: true });

      } else if (r % 2 === 1 && c % 2 === 0){
        // Linea verticale: row: 0..N-1, col: 0..N
        const row = (r-1)/2;
        const col = c/2;
        cell.className = 'v-line';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute('aria-label', `Linea verticale r${row} c${col}`);
        cell.addEventListener('click', onLineClick, { passive: true });

      } else {
        // Box: 0..N-1, 0..N-1
        const row = (r-1)/2;
        const col = (c-1)/2;
        cell.className = 'box';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute('role','gridcell');
      }

      els.board.appendChild(cell);
    }
  }
}

/** Gestione click su una linea */
function onLineClick(ev){
  const line = ev.currentTarget;
  if (line.classList.contains('drawn')) return; // già tracciata

  // Colora la linea con il colore del giocatore corrente
  const drawColor = state.players[state.current].color;
  line.style.setProperty('--draw', drawColor);
  line.classList.add('drawn');

  // Dopo aver tracciato, verifica se chiude uno o più box
  const type = line.classList.contains('h-line') ? 'h' : 'v';
  const r = parseInt(line.dataset.row, 10);
  const c = parseInt(line.dataset.col, 10);

  const closedAny = checkAndClaimBoxes(type, r, c);

  // Se non ha chiuso nulla → cambio turno
  if (!closedAny){
    state.current = 1 - state.current;
  }

  updateTurnUI();

  // Fine partita?
  const totalBoxes = state.N * state.N;
  const claimed = document.querySelectorAll('.box.claimed').length;
  if (claimed === totalBoxes){
    // Mostra punteggio finale automaticamente
    setTimeout(() => showScore(true), 120);
  }
}

/** Controlla i box adiacenti alla linea e li assegna se chiusi */
function checkAndClaimBoxes(type, r, c){
  const N = state.N;
  let closed = false;
  const checks = [];

  if (type === 'h'){
    // sopra (r-1, c) se r>0; sotto (r, c) se r<N
    if (r > 0) checks.push({row: r-1, col: c});
    if (r < N) checks.push({row: r,   col: c});
  } else {
    // sinistra (r, c-1) se c>0; destra (r, c) se c<N
    if (c > 0) checks.push({row: r, col: c-1});
    if (c < N) checks.push({row: r, col: c});
  }

  for (const pos of checks){
    if (isBoxClosed(pos.row, pos.col)){
      claimBox(pos.row, pos.col);
      closed = true;
    }
  }

  return closed;
}

/** Ritorna true se tutti e 4 i lati del box (row,col) sono tracciati */
function isBoxClosed(row, col){
  const top    = document.querySelector(`.h-line[data-row="${row}"][data-col="${col}"]`);
  const bottom = document.querySelector(`.h-line[data-row="${row+1}"][data-col="${col}"]`);
  const left   = document.querySelector(`.v-line[data-row="${row}"][data-col="${col}"]`);
  const right  = document.querySelector(`.v-line[data-row="${row}"][data-col="${col+1}"]`);

  return !!(top && bottom && left && right &&
            top.classList.contains('drawn') &&
            bottom.classList.contains('drawn') &&
            left.classList.contains('drawn') &&
            right.classList.contains('drawn'));
}

/** Assegna il box al giocatore corrente (lettera o colore), incrementa punteggio */
function claimBox(row, col){
  const box = document.querySelector(`.box[data-row="${row}"][data-col="${col}"]`);
  if (!box || box.classList.contains('claimed')) return;

  box.classList.add('claimed');

  const me = state.players[state.current];
  if (me.letter){
    box.textContent = me.letter;
    box.style.color = me.color;
  } else {
    // Riempimento a gradiente neon del colore del giocatore
    box.style.background = `linear-gradient(135deg, ${me.color}33 0%, ${me.color}22 100%)`;
    box.style.boxShadow = `inset 0 0 26px ${me.color}22, 0 0 20px ${me.color}33`;
  }

  me.score++;
}

/** Aggiorna indicatore di turno (pill con glow del colore giocatore) */
function updateTurnUI(){
  const me = state.players[state.current];
  const label = me.letter ? `Giocatore ${state.current+1} (${me.letter})`
                          : `Giocatore ${state.current+1}`;
  els.turnWho.textContent = label;
  els.turnWho.style.color = me.color;
  els.turnWho.style.textShadow = `0 0 8px ${me.color}66, 0 0 16px ${me.color}33`;
}

/** Mostra il punteggio (se final=true aggiunge nota di fine) */
function showScore(final=false){
  const p1 = state.players[0], p2 = state.players[1];
  els.scoreContent.innerHTML = '';

  const line1 = document.createElement('div');
  line1.className = 'score-line';
  line1.innerHTML = `
    <span><span class="score-dot" style="background:${p1.color}"></span>
      Giocatore 1 ${p1.letter ? `(${p1.letter})` : ''}</span>
    <strong>${p1.score}</strong>
  `;

  const line2 = document.createElement('div');
  line2.className = 'score-line';
  line2.innerHTML = `
    <span><span class="score-dot" style="background:${p2.color}"></span>
      Giocatore 2 ${p2.letter ? `(${p2.letter})` : ''}</span>
    <strong>${p2.score}</strong>
  `;

  els.scoreContent.appendChild(line1);
  els.scoreContent.appendChild(line2);

  if (final){
    const note = document.createElement('div');
    note.style.marginTop = '8px';
    note.style.color = '#ffd166';
    const verdict = (p1.score===p2.score) ? 'Pareggio!' : (p1.score>p2.score ? 'Vince il Giocatore 1!' : 'Vince il Giocatore 2!');
    note.textContent = `Partita conclusa • ${verdict}`;
    els.scoreContent.appendChild(note);
  }

  try { els.scoreModal.showModal(); }
  catch { els.scoreModal.setAttribute('open',''); } // fallback
}

/** Torna alla configurazione (senza ricaricare la pagina) */
function resetToConfig(){
  els.board.innerHTML = '';
  state.N = 0;
  state.current = 0;
  state.players[0].score = state.players[1].score = 0;

  els.gameArea.hidden = true;
  els.config.hidden = false;

  if (els.scoreModal.open) els.scoreModal.close();
}