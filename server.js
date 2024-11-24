const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'phaser_game'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// User authentication routes
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length > 0) {
            res.status(200).json(results[0]);
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const query = 'INSERT INTO users (username, password, points) VALUES (?, ?, 0)';
    db.query(query, [username, password], err => {
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).send('Username already exists');
        }
        if (err) return res.status(500).send(err);
        res.status(201).send('User registered');
    });
});

// Player management
let players = {};

io.on('connection', socket => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('playerJoin', playerData => {
        players[socket.id] = playerData;
        io.emit('updatePlayers', players);
    });

    socket.on('playerMove', playerData => {
        if (players[socket.id]) {
            players[socket.id].x = playerData.x;
            players[socket.id].y = playerData.y;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('updateScore', scoreData => {
        if (players[socket.id]) {
            players[socket.id].score = scoreData.score;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

server.listen(3008, () => {
    console.log('Server running on port 3000');
});
