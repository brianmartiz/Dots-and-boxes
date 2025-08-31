'use strict';

/** ======= Stato ======= */
const state = {
  N: 0,
  current: 0, // 0: P1, 1: P2
  players: [
    { letter: '', color: '#00e5ff', score: 0 },
    { letter: '', color: '#ff3df7', score: 0 }
  ],
  history: [] // stack delle mosse per undo
};

const els = {};
const clamp = (min, v, max) => Math.max(min, Math.min(v, max));
const uc1 = (s) => (s || '').trim().slice(0,1).toUpperCase();

/** ======= SFX via WebAudio (niente file) ======= */
let audioCtx = null, muted = false;
function ensureAudio(){
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function tone(freq=880, dur=0.06, type='sine', gain=0.08){
  if (muted) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}
function sfxClick(){ tone(1200, .05, 'triangle', .06); }
function sfxBox(){ tone(520, .12, 'sawtooth', .05); tone(780, .12, 'sine', .05); }
function sfxWin(){
  const seq = [660, 880, 990, 1320];
  seq.forEach((f,i)=> setTimeout(()=> tone(f, .08, 'triangle', .06), i*90));
}

/** ======= Init ======= */
document.addEventListener('DOMContentLoaded', () => {
  Object.assign(els, {
    config: document.getElementById('config'),
    gridSize: document.getElementById('gridSize'),
    p1Letter: document.getElementById('p1Letter'),
    p1Color: document.getElementById('p1Color'),
    p2Letter: document.getElementById('p2Letter'),
    p2Color: document.getElementById('p2Color'),
    startBtn: document.getElementById('startBtn'),

    gameArea: document.getElementById('gameArea'),
    board: document.getElementById('board'),
    turnWho: document.getElementById('turnWho'),
    scoreBtn: document.getElementById('scoreBtn'),
    newBtn: document.getElementById('newBtn'),
    undoBtn: document.getElementById('undoBtn'),
    muteBtn: document.getElementById('muteBtn'),

    scoreModal: document.getElementById('scoreModal'),
    scoreContent: document.getElementById('scoreContent'),
    closeScore: document.getElementById('closeScore'),
  });

  els.startBtn.addEventListener('click', startGame);
  els.scoreBtn.addEventListener('click', () => showScore(false));
  els.closeScore.addEventListener('click', () => els.scoreModal.close());
  els.newBtn.addEventListener('click', resetToConfig);
  els.undoBtn.addEventListener('click', undoMove);
  els.muteBtn.addEventListener('click', toggleMute);
});

function toggleMute(){
  muted = !muted;
  els.muteBtn.setAttribute('aria-pressed', String(!muted ? false : true));
  els.muteBtn.textContent = muted ? '🔇 Muto' : '🔊 Audio';
}

/** ======= Avvio ======= */
function startGame(){
  const N = clamp(1, parseInt(els.gridSize.value, 10) || 4, 10);
  state.N = N;
  state.players[0].letter = uc1(els.p1Letter.value);
  state.players[0].color  = els.p1Color.value || '#00e5ff';
  state.players[1].letter = uc1(els.p2Letter.value);
  state.players[1].color  = els.p2Color.value || '#ff3df7';
  state.players[0].score = 0; state.players[1].score = 0;
  state.current = 0; state.history = [];

  buildBoard(N);

  els.config.hidden = true;
  els.gameArea.hidden = false;
  updateTurnUI();
}

/** ======= Board ======= */
function buildBoard(N){
  const R = 2*N + 1;
  els.board.innerHTML = '';
  els.board.style.gridTemplateColumns = `repeat(${R}, 1fr)`;
  els.board.style.gridTemplateRows = `repeat(${R}, 1fr)`;

  for (let r = 0; r < R; r++){
    for (let c = 0; c < R; c++){
      const cell = document.createElement('div');

      if (r % 2 === 0 && c % 2 === 0){
        cell.className = 'dot';
      } else if (r % 2 === 0 && c % 2 === 1){
        const row = r/2, col = (c-1)/2;
        cell.className = 'h-line';
        cell.dataset.row = row; cell.dataset.col = col;
        cell.addEventListener('click', onLineClick, {passive:true});
      } else if (r % 2 === 1 && c % 2 === 0){
        const row = (r-1)/2, col = c/2;
        cell.className = 'v-line';
        cell.dataset.row = row; cell.dataset.col = col;
        cell.addEventListener('click', onLineClick, {passive:true});
      } else {
        const row = (r-1)/2, col = (c-1)/2;
        cell.className = 'box';
        cell.dataset.row = row; cell.dataset.col = col;
      }

      els.board.appendChild(cell);
    }
  }
}

/** ======= Gioco ======= */
function onLineClick(ev){
  const line = ev.currentTarget;
  if (line.classList.contains('drawn')) return;

  // Registra mossa (pre)
  const prevPlayer = state.current;

  // Colora e “accende” la linea
  const drawColor = state.players[state.current].color;
  line.style.setProperty('--draw', drawColor);
  line.classList.add('drawn');
  sfxClick();

  const type = line.classList.contains('h-line') ? 'h' : 'v';
  const r = +line.dataset.row, c = +line.dataset.col;

  // Controlla box adiacenti
  const closedBoxes = claimAdjacentBoxes(type, r, c);

  // History push
  state.history.push({
    type:'line',
    ltype:type, r, c,
    player: prevPlayer,
    boxes: closedBoxes // [{row,col}]
  });

  // Turno
  if (closedBoxes.length === 0){
    state.current = 1 - state.current;
  } else {
    sfxBox();
  }
  updateTurnUI();

  // Fine partita?
  const total = state.N * state.N;
  const claimed = document.querySelectorAll('.box.claimed').length;
  if (claimed === total){
    setTimeout(()=> { showScore(true); sfxWin(); }, 140);
  }
}

/** Controlla e assegna i box collegati alla linea appena tracciata */
function claimAdjacentBoxes(type, r, c){
  const N = state.N;
  const boxes = [];

  const toCheck = [];
  if (type === 'h'){
    if (r > 0) toCheck.push({row:r-1, col:c});
    if (r < N) toCheck.push({row:r, col:c});
  } else {
    if (c > 0) toCheck.push({row:r, col:c-1});
    if (c < N) toCheck.push({row:r, col:c});
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

  if (me.letter){
    box.textContent = me.letter;
    box.style.color = me.color;
  } else {
    box.style.background = `linear-gradient(135deg, ${me.color}33 0%, ${me.color}22 100%)`;
    box.style.boxShadow = `inset 0 0 26px ${me.color}22, 0 0 20px ${me.color}33`;
  }
  // bagliore sottile
  const shine = document.createElement('div');
  shine.className = 'shine';
  box.appendChild(shine);

  me.score++;
}

/** ======= Undo ======= */
function undoMove(){
  const last = state.history.pop();
  if (!last) return;

  // Ripristina turno precedente
  state.current = last.player;

  // Se c’erano box conquistati, rimuovili
  if (last.boxes?.length){
    last.boxes.forEach(({row,col})=>{
      const box = document.querySelector(`.box[data-row="${row}"][data-col="${col}"]`);
      if (box){
        box.classList.remove('claimed');
        box.style.background = ''; box.style.boxShadow = '';
        box.textContent = '';
      }
    });
    // togli i punti dal giocatore precedente
    state.players[last.player].score -= last.boxes.length;
  }

  // Togli la linea
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

/** ======= UI ======= */
function updateTurnUI(){
  const me = state.players[state.current];
  const label = me.letter ? `Giocatore ${state.current+1} (${me.letter})` : `Giocatore ${state.current+1}`;
  els.turnWho.textContent = label;
  els.turnWho.style.color = me.color;
  els.turnWho.style.textShadow = `0 0 8px ${me.color}66, 0 0 16px ${me.color}33`;
}

function showScore(final=false){
  const p1 = state.players[0], p2 = state.players[1];
  els.scoreContent.innerHTML = '';

  const line1 = document.createElement('div');
  line1.className = 'score-line';
  line1.innerHTML = `<span><span class="score-dot" style="background:${p1.color}"></span>
    Giocatore 1 ${p1.letter?`(${p1.letter})`:''}</span><strong>${p1.score}</strong>`;

  const line2 = document.createElement('div');
  line2.className = 'score-line';
  line2.innerHTML = `<span><span class="score-dot" style="background:${p2.color}"></span>
    Giocatore 2 ${p2.letter?`(${p2.letter})`:''}</span><strong>${p2.score}</strong>`;

  els.scoreContent.appendChild(line1);
  els.scoreContent.appendChild(line2);

  if (final){
    const note = document.createElement('div');
    note.style.marginTop = '8px'; note.style.color = '#ffd166';
    const verdict = (p1.score===p2.score) ? 'Pareggio!' : (p1.score>p2.score ? 'Vince il Giocatore 1!' : 'Vince il Giocatore 2!');
    note.textContent = `Partita conclusa • ${verdict}`;
    els.scoreContent.appendChild(note);
  }

  try { els.scoreModal.showModal(); } catch { els.scoreModal.setAttribute('open',''); }
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