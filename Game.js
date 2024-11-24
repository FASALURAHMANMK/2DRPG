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

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
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

        // Handle server updates for all players
        this.socket.on('updatePlayers', players => {
            this.updatePlayers(players);
        });

        // Initialize input controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Player's initial score
        this.score = 0;

        // Generate treats randomly on the map
        this.treats = this.physics.add.group();
        this.spawnTreats();

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

        // Emit player's movement to the server
        this.socket.emit('playerMove', { x: this.player.x, y: this.player.y });
    }

    // Update other players' positions and the scoreboard
    updatePlayers(players) {
        this.otherPlayers.clear(true, true);

        Object.values(players).forEach(player => {
            if (player.username !== playerData.username) {
                // Add other players' sprites
                const otherPlayerSprite = this.add.sprite(player.x, player.y, 'pet').setScale(2);
                this.add.text(player.x, player.y - 30, player.username, { fontSize: '12px', color: '#fff' });
                this.otherPlayers.add(otherPlayerSprite);
            }
        });

        // Update the live scoreboard
        const scores = Object.values(players)
            .map(player => `${player.username}: ${player.score}`)
            .join('\n');
        this.scoreText.setText(`Scoreboard:\n${scores}`);
    }

    // Spawn random treats on the map
    spawnTreats() {
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(50, 750);
            const y = Phaser.Math.Between(50, 550);
            const treat = this.treats.create(x, y, 'treat');
            treat.anims.play('treatAnim');
        }
    }

    // Logic for collecting treats
    collectTreat(player, treat) {
        // Disable the treat on collection
        treat.disableBody(true, true);

        // Increment player's score
        this.score += 1;

        // Emit the updated score to the server
        this.socket.emit('updateScore', { score: this.score });
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
    scene: [BootScene, GameScene],
};

// Start the Phaser game
function startGame() {
    new Phaser.Game(config);
}
