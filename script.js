'use strict';

/** ===== Stato ===== */
const state = {
  N: 0,
  current: 0,
  players: [
    { name: 'Giocatore 1', letter: '', color: '#12C2E9', score: 0 },
    { name: 'Giocatore 2', letter: '', color: '#F72585', score: 0 }
  ],
  history: []
};

const els = {};
const clamp = (min,v,max)=>Math.max(min,Math.min(v,max));
const uc1 = s => (s||'').trim().slice(0,1).toUpperCase();

/** ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  Object.assign(els, {
    config: document.getElementById('config'),
    gridSize: document.getElementById('gridSize'),
    p1Name: document.getElementById('p1Name'),
    p2Name: document.getElementById('p2Name'),
    p1Letter: document.getElementById('p1Letter'),
    p2Letter: document.getElementById('p2Letter'),
    p1Color: document.getElementById('p1Color'),
    p2Color: document.getElementById('p2Color'),
    startBtn: document.getElementById('startBtn'),

    gameArea: document.getElementById('gameArea'),
    board: document.getElementById('board'),
    turnWho: document.getElementById('turnWho'),
    scoreBtn: document.getElementById('scoreBtn'),
    newBtn: document.getElementById('newBtn'),
    undoBtn: document.getElementById('undoBtn'),

    scoreModal: document.getElementById('scoreModal'),
    scoreContent: document.getElementById('scoreContent'),
    closeScore: document.getElementById('closeScore'),
  });

  els.startBtn.addEventListener('click', startGame);
  els.scoreBtn.addEventListener('click', () => showScore(false));
  els.closeScore.addEventListener('click', () => els.scoreModal.close());
  els.newBtn.addEventListener('click', resetToConfig);
  els.undoBtn.addEventListener('click', undoMove);
});

/** ===== Avvio ===== */
function startGame(){
  const N = clamp(1, parseInt(els.gridSize.value, 10) || 5, 10);
  state.N = N;

  state.players[0].name   = (els.p1Name.value || 'Giocatore 1').trim();
  state.players[1].name   = (els.p2Name.value || 'Giocatore 2').trim();
  state.players[0].letter = uc1(els.p1Letter.value);
  state.players[1].letter = uc1(els.p2Letter.value);
  state.players[0].color  = els.p1Color.value || '#12C2E9';
  state.players[1].color  = els.p2Color.value || '#F72585';
  state.players[0].score = 0; state.players[1].score = 0;
  state.current = 0; state.history = [];

  // palette CSS per linee disegnate (se servono variabili)
  document.documentElement.style.setProperty('--p1', state.players[0].color);
  document.documentElement.style.setProperty('--p2', state.players[1].color);

  buildBoard(N);

  els.config.hidden = true;
  els.gameArea.hidden = false;
  updateTurnUI();
}

/** ===== Board ===== */
function buildBoard(N){
  const R = 2*N + 1;
  els.board.innerHTML = '';
  els.board.style.gridTemplateColumns = `repeat(${R}, 1fr)`;
  els.board.style.gridTemplateRows = `repeat(${R}, 1fr)`;

  for (let r = 0; r < R; r++){
    for (let c = 0; c < R; c++){
      const cell = document.createElement('div');

      if (r%2===0 && c%2===0){
        cell.className = 'dot';

      } else if (r%2===0 && c%2===1){
        const row=r/2, col=(c-1)/2;
        cell.className = 'h-line';
        cell.dataset.row = row; cell.dataset.col = col;
        cell.addEventListener('click', onLineClick, {passive:true});

      } else if (r%2===1 && c%2===0){
        const row=(r-1)/2, col=c/2;
        cell.className = 'v-line';
        cell.dataset.row = row; cell.dataset.col = col;
        cell.addEventListener('click', onLineClick, {passive:true});

      } else {
        const row=(r-1)/2, col=(c-1)/2;
        cell.className = 'box';
        cell.dataset.row = row; cell.dataset.col = col;
      }

      els.board.appendChild(cell);
    }
  }
}

/** ===== Gioco ===== */
function onLineClick(ev){
  const line = ev.currentTarget;
  if (line.classList.contains('drawn')) return;

  const me = state.players[state.current];

  // colora linea con colore pieno del giocatore
  line.style.setProperty('--draw', me.color);
  line.classList.add('drawn');

  const type = line.classList.contains('h-line') ? 'h' : 'v';
  const r = +line.dataset.row, c = +line.dataset.col;

  const closed = claimAdjacentBoxes(type, r, c);

  // registra history per undo
  state.history.push({ ltype:type, r, c, player: state.current, boxes: closed });

  if (closed.length === 0){
    state.current = 1 - state.current;
  } else {
    // piccoli “pixel pulse” già via CSS animation
  }
  updateTurnUI();

  // fine?
  const total = state.N * state.N;
  const claimed = document.querySelectorAll('.box.claimed').length;
  if (claimed === total){
    setTimeout(()=> showScore(true), 100);
  }
}

function claimAdjacentBoxes(type, r, c){
  const N = state.N;
  const boxes = [];
  const toCheck = [];

  if (type==='h'){
    if (r>0) toCheck.push({row:r-1, col:c});
    if (r<N) toCheck.push({row:r, col:c});
  } else {
    if (c>0) toCheck.push({row:r, col:c-1});
    if (c<N) toCheck.push({row:r, col:c});
  }

  for (const pos of toCheck){
    if (isBoxClosed(pos.row, pos.col)){
      claimBox(pos.row, pos.col);
      boxes.push(pos);
    }
  }
  return boxes;
}

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

function claimBox(row, col){
  const box = document.querySelector(`.box[data-row="${row}"][data-col="${col}"]`);
  if (!box || box.classList.contains('claimed')) return;

  const me = state.players[state.current];
  box.classList.add('claimed');
  box.style.backgroundColor = me.color;   // COLORE PIENO
  box.style.color = '#000';

  // se l'utente ha scelto una lettera, la usiamo come marchio “pixel”
  if (me.letter){
    box.textContent = me.letter;
  }
  me.score++;
}

/** ===== Undo ===== */
function undoMove(){
  const last = state.history.pop();
  if (!last) return;

  // ripristina turno
  state.current = last.player;

  // rimuovi eventuali box chiusi
  if (last.boxes?.length){
    last.boxes.forEach(({row,col})=>{
      const box = document.querySelector(`.box[data-row="${row}"][data-col="${col}"]`);
      if (box){
        box.classList.remove('claimed');
        box.style.backgroundColor = '';
        box.textContent = '';
      }
    });
    state.players[last.player].score -= last.boxes.length;
  }

  // rimuovi la linea
  const sel = last.ltype === 'h'
    ? `.h-line[data-row="${last.r}"][data-col="${last.c}"]`
    : `.v-line[data-row="${last.r}"][data-col="${last.c}"]`;
  const line = document.querySelector(sel);
  if (line){
    line.classList.remove('drawn');
    line.style.removeProperty('--draw');
  }

  updateTurnUI();
}

/** ===== UI ===== */
function updateTurnUI(){
  const me = state.players[state.current];
  els.turnWho.textContent = `${me.name}${me.letter ? ` (${me.letter})` : ''}`;
  els.turnWho.style.borderColor = '#223044';
  els.turnWho.style.color = '#e9eef7';
  els.turnWho.style.background = '#0b0f17';
}

function showScore(final=false){
  const p1 = state.players[0], p2 = state.players[1];
  els.scoreContent.innerHTML = '';

  const l1 = document.createElement('div');
  l1.className = 'score-line';
  l1.innerHTML = `<span><i class="score-dot" style="background:${p1.color}"></i> ${p1.name}${p1.letter?` (${p1.letter})`:''}</span><strong>${p1.score}</strong>`;

  const l2 = document.createElement('div');
  l2.className = 'score-line';
  l2.innerHTML = `<span><i class="score-dot" style="background:${p2.color}"></i> ${p2.name}${p2.letter?` (${p2.letter})`:''}</span><strong>${p2.score}</strong>`;

  els.scoreContent.appendChild(l1);
  els.scoreContent.appendChild(l2);

  if (final){
    const note = document.createElement('div');
    note.style.marginTop = '8px';
    note.style.color = '#9fb0c9';
    note.textContent = p1.score===p2.score
      ? 'Pareggio!'
      : (p1.score>p2.score ? `${p1.name} vince!` : `${p2.name} vince!`);
    els.scoreContent.appendChild(note);
  }

  try { els.scoreModal.showModal(); }
  catch { els.scoreModal.setAttribute('open',''); }
}

function resetToConfig(){
  els.board.innerHTML = '';
  state.N = 0; state.current = 0;
  state.players[0].score = state.players[1].score = 0;
  state.history = [];

  els.gameArea.hidden = true;
  els.config.hidden = false;

  if (els.scoreModal.open) els.scoreModal.close();
}