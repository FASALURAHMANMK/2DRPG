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

        // Start the main game scene
        this.scene.start('GameScene');
    }
}
// RoomSelectionScene
class RoomSelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RoomSelectionScene' });
    }

    create() {
        const createButton = this.add.text(200, 150, 'Create Room', {
            fontSize: '32px',
            color: '#fff',
        }).setInteractive();

        const joinButton = this.add.text(200, 250, 'Join Room', {
            fontSize: '32px',
            color: '#fff',
        }).setInteractive();

        // When the Create Room button is clicked
        createButton.on('pointerdown', () => {
            this.socket.emit('createRoom', { username: playerData.username });
        });

        // When the Join Room button is clicked
        joinButton.on('pointerdown', () => {
            this.socket.emit('getRoomList');
        });

        // Listen for room creation success
        this.socket.on('roomCreated', ({ roomId }) => {
            this.add.text(200, 350, `Room Created: ${roomId}`, {
                fontSize: '24px',
                color: '#fff',
            });
            this.waitForPlayers(roomId);
        });

        // Show list of rooms to join
        this.socket.on('updateRoomList', rooms => {
            let y = 300;
            for (const roomId in rooms) {
                const roomButton = this.add.text(200, y, `Join ${roomId}`, {
                    fontSize: '24px',
                    color: '#fff',
                }).setInteractive();

                roomButton.on('pointerdown', () => {
                    this.socket.emit('joinRoom', { roomId, username: playerData.username });
                });

                y += 50;
            }
        });

        // Handle starting the game
        this.socket.on('startGame', ({ roomId }) => {
            this.scene.start('GameScene', { roomId });
        });
    }

    // Wait for players to join before starting the game
    waitForPlayers(roomId) {
        const waitingText = this.add.text(200, 400, 'Waiting for players...', {
            fontSize: '24px',
            color: '#fff',
        });

        this.socket.on('playerJoined', ({ username }) => {
            waitingText.setText(`Player Joined: ${username}`);
            const startButton = this.add.text(200, 450, 'Start Game', {
                fontSize: '24px',
                color: '#fff',
            }).setInteractive();

            startButton.on('pointerdown', () => {
                this.socket.emit('startGame', { roomId });
            });
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create(data) {
        this.roomId = data.roomId;
        // Initialize socket connection
        this.socket = io('http://localhost:3008');

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

        this.socket.emit('startGame', { roomId: this.roomId });

        // Transition back to RoomSelectionScene for replay or exit
        this.socket.on('gameOver', () => {
            this.add.text(200, 300, 'Game Over', { fontSize: '32px', color: '#fff' });
            this.add.text(200, 350, 'Press SPACE to replay', { fontSize: '24px', color: '#fff' });

            this.input.keyboard.once('keydown-SPACE', () => {
                this.socket.emit('replayGame', { roomId: this.roomId });
                this.scene.start('RoomSelectionScene'); // Transition back to room selection
            });
        });

        // Input controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Group to hold treats
        this.treats = this.physics.add.group();

        // Overlap detection for collecting treats
        this.physics.add.overlap(this.player, this.treats, this.collectTreat, null, this);
    }

    update() {
        // Reset player velocity
        this.player.setVelocity(0);
    
        // Move the player based on cursor key input
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-150);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(150);
        }
    
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-150);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(150);
        }
    
        // Emit player's current position to the server
        this.socket.emit('playerMove', {
            x: this.player.x,
            y: this.player.y,
        });
    }
    
    // Update other players' positions and the scoreboard
    updatePlayers(players) {
        this.otherPlayers.clear(true, true);

        Object.values(players).forEach(player => {
            if (player.username !== playerData.username) {
                const playerSprite = this.add.sprite(0, 0, 'pet').setScale(2);
                const usernameText = this.add.text(0, -40, player.username, {
                    fontSize: '12px',
                    color: '#fff',
                    align: 'center',
                }).setOrigin(0.5);

                const playerContainer = this.add.container(player.x, player.y, [playerSprite, usernameText]);
                this.otherPlayers.add(playerContainer);
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
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [BootScene,RoomSelectionScene, GameScene],
};

// Start the Phaser game
function startGame() {
    new Phaser.Game(config);
}
