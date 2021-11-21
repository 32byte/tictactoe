const bodyParser = require('body-parser');
const express = require('express');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3001;

const jsonParser = bodyParser.json();

let db = {
    players: {},
    games: {}
}

function playerWon(board) {
    // horizontal
    if (board[0] === board[1] && board[1] === board[2]) {
        return board[1];
    }
    if (board[3] === board[4] && board[4] === board[5]) {
        return board[4];
    }
    if (board[6] === board[7] && board[7] === board[8]) {
        return board[7];
    }
    // vertical
    if (board[0] === board[3] && board[3] === board[6]) {
        return board[3];
    }
    if (board[1] === board[4] && board[4] === board[7]) {
        return board[4];
    }
    if (board[2] === board[5] && board[5] === board[8]) {
        return board[5];
    }
    // diagonal
    if (board[0] === board[4] && board[4] === board[8]) {
        return board[4];
    }
    if (board[2] === board[4] && board[4] === board[6]) {
        return board[4];
    }
    return 0;
}

// Allow CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    next();
});

app.post('/new-game', jsonParser, (req, res) => {
    const playerID = req.body['playerID'];

    if (playerID === undefined) {
        return res.status(403).send({message: 'Please provide a playerID!'});
    }

    const gameCode = crypto.randomBytes(3).toString('hex');
    
    db['games'][gameCode] = {
        player1: playerID.toString(),
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0]
    };

    db['players'][playerID.toString()] = gameCode;

    return res.send({ 'gameCode': gameCode });
});

app.post('/connect', jsonParser, (req, res) => {
    const playerID = req.body['playerID'];
    const gameCode = req.body['gameCode'];

    if (playerID === undefined || gameCode === undefined) {
        return res.status(403).send({message: 'Please provide playerID, gameCode, index!'});
    }

    if (db['games'][gameCode] === undefined) {
        return res.status(403).send({message: 'Please provide a valid gameCode!'});
    }

    if (db['games'][gameCode]['player1'] === playerID.toString()) {
        return res.status(403).send({message: 'Player 2 can\'t be the same as Player 1'});
    }

    if (db['games'][gameCode]['player2'] !== undefined) {
        return res.status(402).send({message: 'Game is full!'});
    }
    
    db['games'][gameCode]['player2'] = playerID.toString();
    db['players'][playerID.toString()] = gameCode;

    return res.send({ 'gameCode': gameCode });
});

app.post('/place', jsonParser, (req, res) => {
    const playerID = req.body['playerID'];
    const gameCode = req.body['gameCode'];
    const index = req.body['index'];

    // verify input is there 
    if (playerID === undefined || gameCode === undefined || index === undefined) {
        return res.status(403).send({message: 'Please provide playerID, gameCode, index!'});
    }

    // verify gameCode
    if (db['games'][gameCode] === undefined) {
        return res.status(403).send({message: 'Please provide a valid gameCode!'});
    }
    // is game running
    if (db['games'][gameCode]['player2'] === undefined) {
        return res.status(403).send({message: 'Game hasn\'t started yet!'});
    }

    const win = playerWon(db['games'][gameCode]['board']);

    if (win !== 0) {
        return res.status(403).send({message: 'Game is finished, Player ' + win + ' won!'});
    }

    let free = 0;
    // count empty spaces
    db['games'][gameCode]['board'].map(f => {
        if (f === 0) {
            free += 1;
        }
    });

    // is game still running
    if (free === 0) {
        return res.status(403).send({message: 'Game is finished!' + win === 0 ? 'Tie!' : 'Player ' + win + ' won!'});
    }

    const isPlayer1 = db['games'][gameCode]['player1'] === playerID.toString();

    // valid turn
    if (free % 2 === 1 && !isPlayer1 || free % 2 === 0 && isPlayer1) {
        return res.status(403).send({message: 'Not your turn!'});
    }

    // valid position
    if (index > 8 || db['games'][gameCode]['board'][index] !== 0) {
        return res.status(403).send({message: 'Invalid index!'});
    }

    db['games'][gameCode]['board'][index] = isPlayer1 ? 1 : 2;

    return res.send(db['games'][gameCode]['board']);
});

app.get('/games/:gameCode', (req, res) => {
    if (req.params.gameCode === undefined) {
        return res.status(403).send({message: 'Please provide a gameCode!'});
    }

    const gameCode = req.params.gameCode;
    if (db['games'][gameCode] === undefined) {
        return res.status(403).send({message: 'Please provide a valid gameCode!'});
    }

    if (db['games'][gameCode]['player2'] === undefined) {
        return res.send({'started': false});
    } else {
        return res.send(db['games'][gameCode]['board']);
    }
});

app.get('/', (req, res) => {
    return res.send("App running!");
});

app.listen(port, () => {
  console.log(`Tic-Tac-Toe Online running on http://localhost:${port}`);
});
