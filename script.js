// script.js - Game logic for Neon Dots & Boxes

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const undoBtn = document.getElementById('undoBtn');
    const toggleScoreBtn = document.getElementById('toggleScoreBtn');
    const restartBtn = document.getElementById('restartBtn');
    const settingsDiv = document.getElementById('settings');
    const controlsDiv = document.getElementById('controls');
    const scoreboardDiv = document.getElementById('scoreboard');
    const gameBoardDiv = document.getElementById('gameBoard');
    const endScreenDiv = document.getElementById('endScreen');
    const endMessageDiv = document.getElementById('endMessage');
    const score1Div = document.getElementById('score1');
    const score2Div = document.getElementById('score2');

    const soundClick = document.getElementById('soundClick');
    const soundComplete = document.getElementById('soundComplete');
    const soundWin = document.getElementById('soundWin');

    let n, currentPlayer, players, hEdges, vEdges, hOwners, vOwners, boxesOwner, scores;
    let history = [];

    startBtn.addEventListener('click', startGame);
    undoBtn.addEventListener('click', undoMove);
    toggleScoreBtn.addEventListener('click', toggleScore);
    restartBtn.addEventListener('click', () => location.reload());

    function startGame() {
        // Initialize settings
        n = parseInt(document.getElementById('gridSize').value);
        if (isNaN(n) || n < 2 || n > 10) {
            alert('Please enter a grid size between 2 and 10.');
            return;
        }
        const p1Name = document.getElementById('p1Name').value || 'A';
        const p2Name = document.getElementById('p2Name').value || 'B';
        const p1Color = document.getElementById('p1Color').value;
        const p2Color = document.getElementById('p2Color').value;

        players = [
            {name: p1Name, color: p1Color},
            {name: p2Name, color: p2Color}
        ];
        currentPlayer = 0;
        scores = [0, 0];

        // Set CSS variables for colors
        document.documentElement.style.setProperty('--p1-color', p1Color);
        document.documentElement.style.setProperty('--p2-color', p2Color);

        // Hide settings, show game UI
        settingsDiv.classList.add('hidden');
        controlsDiv.classList.remove('hidden');
        gameBoardDiv.classList.remove('hidden');
        score1Div.textContent = players[0].name + ': 0';
        score2Div.textContent = players[1].name + ': 0';

        // Initialize game state
        hEdges = Array.from({ length: n+1 }, () => Array(n).fill(false));
        vEdges = Array.from({ length: n }, () => Array(n+1).fill(false));
        hOwners = Array.from({ length: n+1 }, () => Array(n).fill(null));
        vOwners = Array.from({ length: n }, () => Array(n+1).fill(null));
        boxesOwner = Array.from({ length: n }, () => Array(n).fill(null));
        history = [];

        buildBoard();
    }

    function buildBoard() {
        // Clear existing board
        gameBoardDiv.innerHTML = '';
        // set grid template
        gameBoardDiv.style.gridTemplateColumns = `repeat(${2*n+1}, auto)`;
        // create grid cells
        for (let r = 0; r < 2*n+1; r++) {
            for (let c = 0; c < 2*n+1; c++) {
                if (r % 2 === 0 && c % 2 === 0) {
                    // Dot
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    gameBoardDiv.appendChild(dot);
                } else if (r % 2 === 0 && c % 2 === 1) {
                    // Horizontal edge
                    const edge = document.createElement('div');
                    edge.className = 'edge-h';
                    edge.dataset.row = r / 2;
                    edge.dataset.col = (c-1) / 2;
                    edge.addEventListener('click', () => selectEdge(edge, 'h'));
                    gameBoardDiv.appendChild(edge);
                } else if (r % 2 === 1 && c % 2 === 0) {
                    // Vertical edge
                    const edge = document.createElement('div');
                    edge.className = 'edge-v';
                    edge.dataset.row = (r-1) / 2;
                    edge.dataset.col = c / 2;
                    edge.addEventListener('click', () => selectEdge(edge, 'v'));
                    gameBoardDiv.appendChild(edge);
                } else {
                    // Box
                    const box = document.createElement('div');
                    box.className = 'box';
                    box.dataset.row = (r-1) / 2;
                    box.dataset.col = (c-1) / 2;
                    gameBoardDiv.appendChild(box);
                }
            }
        }
    }

    function selectEdge(edgeElem, type) {
        // get coordinates
        const r = parseInt(edgeElem.dataset.row);
        const c = parseInt(edgeElem.dataset.col);
        // Check if already selected
        if (type === 'h' && hEdges[r][c]) return;
        if (type === 'v' && vEdges[r][c]) return;
        // Save state for undo
        saveHistory();
        // Mark edge
        if (type === 'h') {
            hEdges[r][c] = true;
            hOwners[r][c] = currentPlayer;
        } else {
            vEdges[r][c] = true;
            vOwners[r][c] = currentPlayer;
        }
        // Update UI for edge
        edgeElem.classList.add('player' + (currentPlayer+1));
        // Play click sound
        soundClick.currentTime = 0;
        soundClick.play().catch(e => {});
        // Check for completed boxes
        let completed = false;
        // Check boxes around this edge
        if (type === 'h') {
            // above box
            if (r > 0) {
                if (hEdges[r-1][c] && vEdges[r-1][c] && vEdges[r-1][c+1]) {
                    claimBox(r-1, c);
                    completed = true;
                }
            }
            // below box
            if (r < n) {
                if (hEdges[r+1][c] && vEdges[r][c] && vEdges[r][c+1]) {
                    claimBox(r, c);
                    completed = true;
                }
            }
        } else {
            // left box
            if (c > 0) {
                if (vEdges[r][c-1] && hEdges[r][c-1] && hEdges[r+1][c-1]) {
                    claimBox(r, c-1);
                    completed = true;
                }
            }
            // right box
            if (c < n) {
                if (vEdges[r][c+1] && hEdges[r][c] && hEdges[r+1][c]) {
                    claimBox(r, c);
                    completed = true;
                }
            }
        }
        if (completed) {
            // play box complete sound
            soundComplete.currentTime = 0;
            soundComplete.play().catch(e => {});
            // same player moves again
        } else {
            // change player
            currentPlayer = 1 - currentPlayer;
        }
        updateScores();
        // Check for end of game
        if (scores[0] + scores[1] === n * n) {
            endGame();
        }
    }

    function claimBox(r, c) {
        // Only claim if not already claimed
        if (boxesOwner[r][c] === null) {
            boxesOwner[r][c] = currentPlayer;
            scores[currentPlayer]++;
            // color the box
            const boxElem = document.querySelector(`.box[data-row='${r}'][data-col='${c}']`);
            if (boxElem) {
                boxElem.classList.add('player' + (currentPlayer+1));
                // add player letter
                const span = document.createElement('span');
                span.textContent = players[currentPlayer].name;
                boxElem.appendChild(span);
            }
        }
    }

    function updateScores() {
        score1Div.textContent = players[0].name + ': ' + scores[0];
        score2Div.textContent = players[1].name + ': ' + scores[1];
    }

    function endGame() {
        endScreenDiv.classList.remove('hidden');
        // Determine winner or tie
        let msg;
        if (scores[0] > scores[1]) {
            msg = players[0].name + ' wins!';
        } else if (scores[1] > scores[0]) {
            msg = players[1].name + ' wins!';
        } else {
            msg = "It's a tie!";
        }
        endMessageDiv.textContent = msg;
        // Play win sound
        soundWin.currentTime = 0;
        soundWin.play().catch(e => {});
    }

    function saveHistory() {
        const state = {
            h: hEdges.map(arr => arr.slice()),
            v: vEdges.map(arr => arr.slice()),
            hOwners: hOwners.map(arr => arr.slice()),
            vOwners: vOwners.map(arr => arr.slice()),
            boxes: boxesOwner.map(arr => arr.slice()),
            currentPlayer: currentPlayer,
            scores: [...scores]
        };
        history.push(state);
    }

    function undoMove() {
        if (history.length === 0) return;
        const prev = history.pop();
        hEdges = prev.h;
        vEdges = prev.v;
        hOwners = prev.hOwners;
        vOwners = prev.vOwners;
        boxesOwner = prev.boxes;
        currentPlayer = prev.currentPlayer;
        scores = prev.scores;
        // Remove all edge and box styles
        document.querySelectorAll('.edge-h, .edge-v').forEach(e => {
            e.className = e.className.split(' ')[0]; // remove player classes
        });
        document.querySelectorAll('.box').forEach(b => {
            b.className = 'box';
            b.textContent = '';
        });
        // Reapply edges from owners
        for (let r = 0; r < hOwners.length; r++) {
            for (let c = 0; c < hOwners[r].length; c++) {
                const owner = hOwners[r][c];
                if (owner !== null) {
                    const edge = document.querySelector(`.edge-h[data-row='${r}'][data-col='${c}']`);
                    if (edge) edge.classList.add('player' + (owner+1));
                }
            }
        }
        for (let r = 0; r < vOwners.length; r++) {
            for (let c = 0; c < vOwners[r].length; c++) {
                const owner = vOwners[r][c];
                if (owner !== null) {
                    const edge = document.querySelector(`.edge-v[data-row='${r}'][data-col='${c}']`);
                    if (edge) edge.classList.add('player' + (owner+1));
                }
            }
        }
        // Reapply boxes
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const owner = boxesOwner[r][c];
                if (owner !== null) {
                    const box = document.querySelector(`.box[data-row='${r}'][data-col='${c}']`);
                    if (box) {
                        box.classList.add('player' + (owner+1));
                        const span = document.createElement('span');
                        span.textContent = players[owner].name;
                        box.appendChild(span);
                    }
                }
            }
        }
        updateScores();
    }

    function toggleScore() {
        scoreboardDiv.classList.toggle('hidden');
    }
});