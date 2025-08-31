document.addEventListener('DOMContentLoaded', () => {
    // Elementi dell'interfaccia utente (UI)
    const setupDiv = document.getElementById('setup');
    const gameContainer = document.getElementById('game-container');
    const gridSizeInput = document.getElementById('grid-size');
    const p1MarkerInput = document.getElementById('p1-marker');
    const p2MarkerInput = document.getElementById('p2-marker');
    const startGameBtn = document.getElementById('start-game-btn');
    const board = document.getElementById('board');
    const turnIndicator = document.getElementById('turn-indicator');
    const scoreBtn = document.getElementById('score-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const scoreModal = document.getElementById('score-modal');
    const scoreDisplay = document.getElementById('score-display');
    const closeBtn = document.querySelector('.close-btn');

    // Variabili di stato del gioco
    let gridSize;
    let players;
    let currentPlayer;
    let scores;
    let horizontalLines;
    let verticalLines;
    let boxes;
    let gameEnded;

    // Colori NEON predefiniti
    const NEON_COLORS = {
        p1: '#00f6ff', // Ciano
        p2: '#ff00e5'  // Magenta
    };

    // --- GESTIONE DEGLI EVENTI ---
    startGameBtn.addEventListener('click', initializeGame);
    newGameBtn.addEventListener('click', () => {
        gameContainer.classList.add('hidden');
        setupDiv.classList.remove('hidden');
    });
    scoreBtn.addEventListener('click', () => {
        scoreDisplay.innerHTML = `Giocatore 1: <span style="color:${NEON_COLORS.p1}">${scores.p1}</span> - Giocatore 2: <span style="color:${NEON_COLORS.p2}">${scores.p2}</span>`;
        scoreModal.classList.remove('hidden');
    });
    closeBtn.addEventListener('click', () => scoreModal.classList.add('hidden'));
    window.addEventListener('click', (event) => {
        if (event.target == scoreModal) scoreModal.classList.add('hidden');
    });

    // --- FUNZIONI PRINCIPALI DEL GIOCO ---

    function initializeGame() {
        gridSize = parseInt(gridSizeInput.value);
        if (gridSize < 2 || gridSize > 10) {
            alert("La grandezza della griglia deve essere tra 2 e 10.");
            return;
        }

        players = {
            p1: { marker: p1MarkerInput.value || 'P1', color: NEON_COLORS.p1 },
            p2: { marker: p2MarkerInput.value || 'P2', color: NEON_COLORS.p2 }
        };

        currentPlayer = 1;
        scores = { p1: 0, p2: 0 };
        gameEnded = false;
        
        horizontalLines = Array(gridSize + 1).fill(null).map(() => Array(gridSize).fill(false));
        verticalLines = Array(gridSize).fill(null).map(() => Array(gridSize + 1).fill(false));
        boxes = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));

        setupDiv.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        
        updateTurnIndicator();
        createBoard();
    }

    function createBoard() {
        board.innerHTML = '';
        const boardSize = gridSize * 2 + 1;
        board.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${boardSize}, 30px)`;

        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const cell = document.createElement('div');
                if (row % 2 === 0 && col % 2 === 0) {
                    cell.classList.add('dot');
                } else if (row % 2 === 0 && col % 2 !== 0) {
                    cell.classList.add('line', 'horizontal');
                    cell.dataset.row = row / 2;
                    cell.dataset.col = (col - 1) / 2;
                    cell.addEventListener('click', handleLineClick);
                } else if (row % 2 !== 0 && col % 2 === 0) {
                    cell.classList.add('line', 'vertical');
                    cell.dataset.row = (row - 1) / 2;
                    cell.dataset.col = col / 2;
                    cell.addEventListener('click', handleLineClick);
                } else {
                    cell.classList.add('box');
                    cell.dataset.row = (row - 1) / 2;
                    cell.dataset.col = (col - 1) / 2;
                }
                board.appendChild(cell);
            }
        }
    }

    function handleLineClick(event) {
        if (gameEnded) return;

        const line = event.target;
        if (line.classList.contains('taken')) return;

        const row = parseInt(line.dataset.row);
        const col = parseInt(line.dataset.col);
        let boxCompleted = false;
        const playerColor = (currentPlayer === 1) ? players.p1.color : players.p2.color;

        line.classList.add('taken');
        line.style.backgroundColor = playerColor;
        line.style.boxShadow = `0 0 10px ${playerColor}`;

        if (line.classList.contains('horizontal')) {
            horizontalLines[row][col] = true;
            if (row > 0 && checkBox(row - 1, col)) boxCompleted = true;
            if (row < gridSize && checkBox(row, col)) boxCompleted = true;
        } else {
            verticalLines[row][col] = true;
            if (col > 0 && checkBox(row, col - 1)) boxCompleted = true;
            if (col < gridSize && checkBox(row, col)) boxCompleted = true;
        }

        if (!boxCompleted) {
            switchPlayer();
        }
        
        if (!gameEnded) {
            updateTurnIndicator();
        }
        
        checkGameOver();
    }

    function checkBox(row, col) {
        if (boxes[row][col] !== 0) return false;

        if (horizontalLines[row][col] && horizontalLines[row + 1][col] &&
            verticalLines[row][col] && verticalLines[row][col + 1]) {
            
            boxes[row][col] = currentPlayer;
            if (currentPlayer === 1) scores.p1++; else scores.p2++;
            
            const boxElement = document.querySelector(`.box[data-row='${row}'][data-col='${col}']`);
            const player = (currentPlayer === 1) ? players.p1 : players.p2;
            
            boxElement.style.backgroundColor = `${player.color}33`; // Colore con trasparenza
            boxElement.style.color = player.color;
            boxElement.style.textShadow = `0 0 10px ${player.color}, 0 0 15px ${player.color}`;
            boxElement.textContent = player.marker;
            
            return true;
        }
        return false;
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
    }

    function updateTurnIndicator() {
        const playerColor = (currentPlayer === 1) ? players.p1.color : players.p2.color;
        turnIndicator.textContent = `Turno del Giocatore ${currentPlayer}`;
        turnIndicator.style.color = playerColor;
        turnIndicator.style.textShadow = `0 0 8px ${playerColor}`;
    }

    function checkGameOver() {
        if (scores.p1 + scores.p2 === gridSize * gridSize) {
            gameEnded = true;
            let winnerMessage;
            if (scores.p1 > scores.p2) {
                winnerMessage = `Vince il Giocatore 1!`;
                turnIndicator.style.color = players.p1.color;
                turnIndicator.style.textShadow = `0 0 8px ${players.p1.color}`;
            } else if (scores.p2 > scores.p1) {
                winnerMessage = `Vince il Giocatore 2!`;
                turnIndicator.style.color = players.p2.color;
                turnIndicator.style.textShadow = `0 0 8px ${players.p2.color}`;
            } else {
                winnerMessage = 'Pareggio!';
                turnIndicator.style.color = '#e0e0e0';
                turnIndicator.style.textShadow = `0 0 8px #e0e0e0`;
            }
            turnIndicator.textContent = `Partita finita! ${winnerMessage}`;
        }
    }
});
