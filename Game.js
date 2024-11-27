const socket = io('http://localhost:3008'); // Single global socket connection
// BootScene
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Preload assets for the game
        this.load.image('map', 'assets/images/map.png');
        this.load.spritesheet('pet', 'assets/images/pet.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('treat', 'assets/images/treat.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        // Create animations for the treats
        this.anims.create({
            key: 'treatAnim',
            frames: this.anims.generateFrameNumbers('treat', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1,
        });
        // Start the room selection scene
        this.scene.start('RoomSelectionScene');
    }
}

// RoomSelectionScene
class RoomSelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RoomSelectionScene' });
    }

    create() {
        // Use the socket passed from the preBoot callback
        this.socket = this.game.socket;

        // Add UI elements
        const createButton = this.add.text(250, 150, 'Create Room', {
            fontSize: '32px',
            color: '#fff',
            fontStyle: 'bold',
        }).setInteractive();

        const joinButton = this.add.text(230, 220, 'Availabe Rooms:', {
            fontSize: '28px',
            color: '#fff',
        });

        // Handle Create Room button click
        createButton.on('pointerdown', () => {
            this.socket.emit('createRoom', { username: playerData.username });
        });

        // Listen for room creation success
        this.socket.on('roomCreated', ({ roomId }) => {
            this.add.text(180, 190, `Room Created: ${roomId}`, {
                fontSize: '24px',
                color: '#fff',
            });
            this.waitForPlayers(roomId);
        });

        // Listen for updated room list
        this.socket.on('updateRoomList', rooms => {
            let y = 260;
            for (const roomId in rooms) {
                const roomButton = this.add.text(230, y, `Join ${roomId}`, {
                    fontSize: '24px',
                    color: '#fff',
                }).setInteractive();

                roomButton.on('pointerdown', () => {
                    this.socket.emit('joinRoom', { roomId, username: playerData.username });
                });

                y += 30;
            }
        });

        // Handle game start
        this.socket.on('startGame', ({ roomId }) => {
            this.scene.start('GameScene', { roomId });
        });
    }

    waitForPlayers(roomId) {
        const waitingText = this.add.text(210, 500, 'Waiting for players...', {
            fontSize: '24px',
            color: '#fff',
        });

        this.socket.on('playerJoined', ({ username }) => {
            waitingText.setText(`Player Joined: ${username}`);
            const startButton = this.add.text(270, 450, 'Start Game', {
                fontSize: '24px',
                color: '#fff',
            }).setInteractive();

            startButton.on('pointerdown', () => {
                this.socket.emit('startGame', { roomId });
            });
        });
    }
    
}

// GameScene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create(data) {
        this.roomId = data.roomId; // Room ID passed from RoomSelectionScene
        this.socket = this.game.socket; // Use global socket

        // Add background map
        this.add.tileSprite(400, 300, 800, 600, 'map');

        // Add the player sprite
        this.player = this.physics.add.sprite(100, 100, 'pet').setScale(2);
        this.player.setCollideWorldBounds(true);

        // Emit player data to the server on joining
        this.socket.emit('playerJoin', {
            username: playerData.username,
            score: 0,
            x: this.player.x,
            y: this.player.y,
        });

        // Group to hold other players
        this.otherPlayers = this.add.group();

        // Score text displayed in the top-left corner
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#fff' });

        // Listen for updates from the server
        this.socket.on('updatePlayers', players => {
            this.updatePlayers(players);
        });

        this.socket.on('treatsData', (treats) => {
            this.spawnTreats(treats);
        });

        this.socket.on('updateTreats', (data) => {
            const treat = this.treats.children.entries.find(t => t.getData('index') === data.index);
            if (treat && data.collected) {
                treat.disableBody(true, true);
            }
        });

        // Input controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Group to hold treats
        this.treats = this.physics.add.group();

        // Overlap detection for collecting treats
        this.physics.add.overlap(this.player, this.treats, this.collectTreat, null, this);

        // Handle game over
        this.socket.on('gameOver', ({ winners }) => {
            // Display game status
            const message =
                winners.length > 1
                    ? `Game Over: It's a draw between ${winners.join(', ')}!`
                    : `Game Over: Winner is ${winners[0]}!`;
                    const background = this.add.graphics(0, 0);

                    // Set background size to cover the entire screen
                    const width = this.cameras.main.width;
                    const height = this.cameras.main.height;
                    background.fillStyle(0x000000, 0.4); // Black color with 30% transparency
                    background.fillRect(0, 0, width, height);
            const gameOverText = this.add.text(115, 270, message, {
                fontSize: '36px',
                color: '#fff',
                fontStyle: 'bold',
            });
            gameOverText.setDepth(1);
            const replayText = this.add.text(230, 320, 'Press SPACE to reset', {
                fontSize: '24px',
                color: '#fff',
            });
            replayText.setDepth(1);
            // Add SPACE key listener for resetting
            const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            spaceKey.once('down', () => {
                this.socket.emit('resetGame');
                window.location.reload();
            });
        }); 
        
    }

    update() {
        // Handle player movement
        this.player.setVelocity(0);
        if (this.cursors.left.isDown) this.player.setVelocityX(-150);
        if (this.cursors.right.isDown) this.player.setVelocityX(150);
        if (this.cursors.up.isDown) this.player.setVelocityY(-150);
        if (this.cursors.down.isDown) this.player.setVelocityY(150);

        // Emit movement to server
        this.socket.emit('playerMove', { x: this.player.x, y: this.player.y });
    }

    updatePlayers(players) {
        this.otherPlayers.clear(true, true);
        Object.values(players).forEach(player => {
            if (player.username !== playerData.username) {
                const playerSprite = this.add.sprite(0, 0, 'pet').setScale(2);
                const usernameText = this.add.text(0, -40, player.username, {
                    fontSize: '12px',
                    color: '#fff',
                    align: 'center',
                }).setOrigin(0.5); // Center the text
    
                // Group them in a container
                const playerContainer = this.add.container(player.x, player.y, [playerSprite, usernameText]);
                this.otherPlayers.add(playerContainer);
                this.add.existing(usernameText);
            }
        });
        const scores = Object.values(players)
            .map(player => `${player.username}: ${player.score}`)
            .join('\n');
        this.scoreText.setText(`Scoreboard:\n${scores}`);
    }

    spawnTreats(treatsData) {
        this.treats.clear(true, true);
        treatsData.forEach((treat, index) => {
            if (!treat.collected) {
                const newTreat = this.treats.create(treat.x, treat.y, 'treat');
                newTreat.setData('index', index);
                newTreat.anims.play('treatAnim');
            }
        });
    }

    collectTreat(player, treat) {
        const index = treat.getData('index');
        treat.disableBody(true, true);
        this.socket.emit('collectTreat', index);
    }   
}

// Phaser game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false },
    },
    callbacks: {
        preBoot: (game) => {
            game.socket = socket; // Pass the socket instance
        },
    },
    scene: [BootScene, RoomSelectionScene, GameScene], // Include all scenes
};

// Start the Phaser game
function startGame() {
    new Phaser.Game(config);
}
