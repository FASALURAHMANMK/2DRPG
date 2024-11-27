const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const db = new sqlite3.Database('./game.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
    if (err) {
        console.error('Failed to connect to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});
db.serialize(() => {
    db.run(
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            points INTEGER DEFAULT 0
        )`,
        err => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        }
    );
});
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// User authentication routes
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.get(query, [username, password], (err, row) => {
        if (err) {
            res.status(500).send(err.message);
        } else if (row) {
            res.status(200).json(row);
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const query = 'INSERT INTO users (username, password, points) VALUES (?, ?, 0)';
    db.run(query, [username, password], function (err) {
        if (err && err.code === 'SQLITE_CONSTRAINT') {
            res.status(409).send('Username already exists');
        } else if (err) {
            res.status(500).send(err.message);
        } else {
            res.status(201).send('User registered');
        }
    });
});

// Player management
let players = {};
let treats = [];
let rooms = {}; // Tracks rooms

// Function to create a new room
function createRoom(hostId, hostName) {
    const roomId = `room-${Math.random().toString(36).substr(2, 8)}`; // Unique ID
    rooms[roomId] = {
        hostId,
        hostName,
        players: [hostId],
        isActive: false, // Indicates if the game has started
    };
    return roomId;
}

// Add player to an existing room
function joinRoom(roomId, playerId) {
    if (rooms[roomId] && !rooms[roomId].isActive) {
        rooms[roomId].players.push(playerId);
        return true;
    }
    return false;
}

// Remove room after game ends or host exits
function removeRoom(roomId) {
    delete rooms[roomId];
}
// Function to initialize treats
function initializeTreats() {
    treats = [];
    for (let i = 0; i < 10; i++) {
        const x = Math.floor(Math.random() * 700) + 50;
        const y = Math.floor(Math.random() * 500) + 50;
        treats.push({ x, y, collected: false });
    }
}
function initializeRoomTreats(roomId) {
    rooms[roomId].treats = [];
    for (let i = 0; i < 10; i++) {
        const x = Math.floor(Math.random() * 700) + 50;
        const y = Math.floor(Math.random() * 500) + 50;
        rooms[roomId].treats.push({ x, y, collected: false });
    }
}
function resetPlayerScores(roomId) {
    rooms[roomId].players.forEach(playerId => {
        if (players[playerId]) {
            players[playerId].score = 0;
        }
    });
}


// Add more treats when a new user joins
function addTreats(numTreats = 5) {
    for (let i = 0; i < numTreats; i++) {
        const x = Math.floor(Math.random() * 700) + 50;
        const y = Math.floor(Math.random() * 500) + 50;
        treats.push({ x, y, collected: false });
    }
}

// Emit treats to players when they join
io.on('connection', socket => {
    console.log(`Player connected: ${socket.id}`);

    // Send treats and existing player data to new players
    socket.emit('treatsData', treats);
    socket.emit('updatePlayers', players);

    socket.on('createRoom', ({ username }) => {
        const roomId = createRoom(socket.id, username);
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, host: true });
        io.emit('updateRoomList', rooms); // Broadcast updated room list
    });
    socket.on('joinRoom', ({ roomId, username }) => {
        if (joinRoom(roomId, socket.id)) {
            socket.join(roomId);
            players[socket.id] = { username, roomId };
            io.to(roomId).emit('playerJoined', { username, roomId });
            io.emit('updateRoomList', rooms); // Broadcast updated room list
        } else {
            socket.emit('roomJoinFailed', 'Room is full or game has started');
        }
    });
    socket.on('startGame', ({ roomId }) => {
        if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
            rooms[roomId].isActive = true;
            io.to(roomId).emit('startGame', { roomId });
            io.emit('updateRoomList', rooms); // Remove from public list
        }
    });
    // Handle player join
    socket.on('playerJoin', playerData => {
        players[socket.id] = playerData;
        addTreats(3); // Add more treats when a new player joins
        io.emit('treatsData', treats); // Broadcast updated treats
        io.emit('updatePlayers', players); // Broadcast updated player data
    });

    // Handle player movement
    socket.on('playerMove', playerData => {
        if (players[socket.id]) {
            players[socket.id].x = playerData.x;
            players[socket.id].y = playerData.y;
            io.emit('updatePlayers', players);
        }
    });
    
    // Handle treat collection
    socket.on('collectTreat', index => {
        if (!treats[index].collected && players[socket.id]) {
            treats[index].collected = true;
            players[socket.id].score += 1; // Update player score
            io.emit('updateTreats', { index, collected: true });
            io.emit('updatePlayers', players);
    
            // Check if all treats are collected
            const allCollected = treats.every(treat => treat.collected);
            if (allCollected) {
                const scores = Object.values(players).map(player => ({
                    username: player.username,
                    score: player.score,
                }));
    
                const maxScore = Math.max(...scores.map(s => s.score));
                const winners = scores.filter(s => s.score === maxScore).map(s => s.username);
    
                io.emit('gameOver', { winners });
            }
        }
    });
    
    socket.on('resetGame', () => {
        const roomId = players[socket.id]?.roomId;
        if (roomId && rooms[roomId]) {
            rooms[roomId].isActive = false; // Reset room to inactive state
            initializeRoomTreats(roomId); // Reset treats
            resetPlayerScores(roomId); // Reset player scores
            io.to(roomId).emit('resetGame'); // Notify clients to reset
        } else {
            // Global reset if no specific room is found
            players = {};
            treats = [];
            rooms = {};
            io.emit('resetGame'); // Notify all clients
        }
        console.log('Game state fully reset');
    });
       
    socket.on('disconnect', () => {
        const roomId = players[socket.id]?.roomId;
        if (roomId && rooms[roomId]) {
            rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
            if (rooms[roomId].players.length === 0) {
                removeRoom(roomId); // Remove room if empty
            } else if (rooms[roomId].hostId === socket.id) {
                io.to(roomId).emit('hostDisconnected'); // Notify remaining players
                removeRoom(roomId);
            }
        }
        delete players[socket.id];
        io.emit('updateRoomList', rooms); // Broadcast updated room list
    });
    
    
});

// Initialize treats on server start
initializeTreats();

server.listen(3008, () => {
    console.log('Server running on port 3008');
});
