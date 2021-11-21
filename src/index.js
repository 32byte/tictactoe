import { createBrowserHistory } from 'history';
import ReactDOM from 'react-dom';
import React from 'react';

import './index.css';
import logo from './logo.png';

const crypto = require('crypto');
const HEROKU_URL = 'https://fierce-oasis-65802.herokuapp.com';

function playerWon(board) {
    // horizontal
    if (board[0] === board[1] && board[1] === board[2]) {
        return [board[1], [0, 1, 2]];
    }
    if (board[3] === board[4] && board[4] === board[5]) {
        return [board[4], [3, 4, 5]];
    }
    if (board[6] === board[7] && board[7] === board[8]) {
        return [board[7], [6, 7, 8]];
    }
    // vertical
    if (board[0] === board[3] && board[3] === board[6]) {
        return [board[3], [0, 3, 6]];
    }
    if (board[1] === board[4] && board[4] === board[7]) {
        return [board[4], [1, 4, 7]];
    }
    if (board[2] === board[5] && board[5] === board[8]) {
        return [board[5], [2, 5, 8]];
    }
    // diagonal
    if (board[0] === board[4] && board[4] === board[8]) {
        return [board[0], [0, 4, 8]];
    }
    if (board[2] === board[4] && board[4] === board[6]) {
        return [board[4], [2, 4, 6]];
    }
    return [0, []];
}

class PlayMenu extends React.Component {
    onClickPlay = () => {
        const input = document.getElementById('gcInput');
        const gameCode = input.value;

        if (gameCode === '') { 
            input.value = '';
        } else {
            this.props.connectGame(gameCode);
        }
    }

    newGame = () => {
        this.props.newGame();
    }

    render() {
        return (
            <div id='playMenu' className='centeredDiv'>
                <img src={logo} alt="Logo" />
                <input id='gcInput' type='text' placeholder='enter game code'></input>
                <br />
                <button onClick={this.onClickPlay}>Connect</button>
                <br />
                <button onClick={this.newGame}>Create new Game</button>
            </div>
        )
    }
}

class Field extends React.Component {
    onClick = () => {
        fetch(HEROKU_URL + '/place', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({'playerID': this.props.playerID, 'gameCode': this.props.gameCode, 'index': this.props.index})
        }).then(res => res.json()).then((data) => {
            if (data['message'] !== undefined) {
                this.props.updateText(data['message']);
            } else {
                this.props.updateBoard(data);
            }
        });
    }

    render() {
        return (
            <div className='box'>
                <button className={this.props.highlight ? 'field highlight' : 'field'} onClick={this.onClick}>{this.props.value === 0 ? '' : (this.props.value === 1 ? 'X' : 'O')}</button>
            </div>
        )
    }
}

class Game extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            win: [],
            gameCode: props.gameCode
        }
    }

    componentDidMount() {
        this.fetchBoard();

        this.timerID = setInterval(
            () => this.fetchBoard(),
            3000
        )
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    updateBoard = (board) => {
        if (!Array.isArray(board)) {
            this.updateText('Waiting for Player 2 to connect..');
        } else {
            let free = 0;
            // count empty spaces
            board.map(f => {
                if (f === 0) {
                    free += 1;
                }
            });
    
            if ((free % 2 === 1 && this.props.player1) || (free % 2 === 0 && !this.props.player1)) {
                this.updateText('It\'s your turn!');
            } else {
                this.updateText('Waiting for opponent to move!');
            }

            const [player, win] = playerWon(board);

            if (win.length !== 0 && player !== 0) {
                this.updateText('Player ' + player + ' won!');
            } else if (free === 0) {
                this.updateText('Tie!');
            }
    
            this.setState({
                board: board,
                win: win,
            });
        }
    }

    fetchBoard = () => {
        fetch(HEROKU_URL + '/games/' + this.state.gameCode)
            .then(res => res.json())
            .then(data => {
                this.updateBoard(data);
            });
    }

    updateText = (text) => {
        const tf = document.getElementById('message');
        tf.innerText = text;
    }

    render() {
        const board = this.state.board.map((val, idx) => 
            <Field key={idx} value={val} index={idx} playerID={this.props.playerID} highlight={this.state.win.includes(idx)}
                gameCode={this.props.gameCode} updateText={this.updateText} updateBoard={this.updateBoard} />
        );

        return (
            <div id='game' className='centeredDiv'>
                <h1 id='message'>Waiting for Player 2 to connect..</h1>
                {board}
            </div>
        )
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);

        let history = createBrowserHistory();

        this.unlisten = history.listen((e) => {
            this.updateRouting(e.location);
        })

        this.state = {
            gameCode: -1,
        }
    }

    connectGame = (gameCode) => {
        const playerID = crypto.randomBytes(8).toString('hex');

        fetch(HEROKU_URL + '/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({'playerID': playerID, 'gameCode': gameCode})
        }).then(res => res.json()).then((data) => {
            if (data['message'] !== undefined) {
                alert(data['message']);
                return;
            }

            this.setState({
                gameCode: gameCode,
                playerID: playerID,
                player1: false,
            })
            window.history.pushState(null, '', '/game/' + gameCode.toString());
        });
    }

    newGame = () => {
        const playerID = crypto.randomBytes(8).toString('hex');

        fetch(HEROKU_URL + '/new-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({'playerID': playerID})
        }).then(res => res.json()).then((data) => {
            if (data['message'] !== undefined) {
                alert(data['message']);
                return;
            }

            this.setState({
                gameCode: data['gameCode'],
                playerID: playerID,
                player1: true,
            });
            window.history.pushState(null, '', '/game/' + data['gameCode']);
        });
    }

    updateRouting = (location) => {
        if (location.pathname.startsWith('/game/') && !this.state.inGame) {
            const gameCode = location.pathname.replace('/game/', '');
            
            if (gameCode === '' || this.state.playerID === undefined) {
                window.history.pushState(null, '', '/');
                this.setState({
                    gameCode: -1,
                });
            } else {
                this.setState({
                    gameCode: gameCode,
                });
            }
        } else {
            this.setState({
                gameCode: -1,
            })
        }
    }

    componentDidMount() {
        this.updateRouting(window.location);
    }

    componentWillUnmount() {
        this.unlisten();
    }

    render() {
        return (
            <div id='app'>
                {this.state.gameCode === -1 ? 
                    <PlayMenu connectGame={this.connectGame} newGame={this.newGame}/> : 
                    <Game gameCode={this.state.gameCode} playerID={this.state.playerID} player1={this.state.player1}/>}
            </div>
        )
    }
}

ReactDOM.render(
    (<App />),
    document.getElementById('root')
);