class BootScene extends Phaser.Scene {
        constructor() {
            super({ key: 'BootScene' });
        }

        preload() {
            this.load.image('map', 'assets/images/map.png');
            this.load.spritesheet('pet', 'assets/images/pet.png', { frameWidth: 32, frameHeight: 32 });
            this.load.spritesheet('treat', 'assets/images/treat.png', { frameWidth: 32, frameHeight: 32 });
        }

        create() {
        this.anims.create({
        key: 'treatAnim',
        frames: this.anims.generateFrameNumbers('treat', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
    });
            this.scene.start('GameScene');
        }
    }

    class GameScene extends Phaser.Scene {
        constructor() {
            super({ key: 'GameScene' });
        }

        create() {

this.add.tileSprite(400, 300, 800, 600, 'map');



this.player = this.physics.add.sprite(100, 100, 'pet').setScale(2);
this.player.setCollideWorldBounds(true);

this.treats = this.physics.add.group();
for (let i = 0; i < 10; i++) {
    const x = Phaser.Math.Between(50, 750);
    const y = Phaser.Math.Between(50, 550);
    const treat = this.treats.create(x, y, 'treat');
    treat.setCollideWorldBounds(true);
    treat.anims.play('treatAnim');
}

this.physics.add.overlap(this.player, this.treats, this.collectTreat, null, this);

this.cursors = this.input.keyboard.createCursorKeys();
}

        update() {
            this.player.setVelocity(0);

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
        }

        collectTreat(player, treat) {
            treat.disableBody(true, true);
            playerStats.treats += 1;

            if (this.treats.countActive(true) === 0) {
                this.scene.start('BattleScene', { playerStats });
            }
        }
    }

    class BattleScene extends Phaser.Scene {
        constructor() {
            super({ key: 'BattleScene' });
        }

        create(data) {
            this.add.text(100, 100, `Battle Time!`, { fontSize: '32px', color: '#fff' });

            this.add.text(100, 150, `HP: ${data.playerStats.hp}`, { fontSize: '24px', color: '#fff' });
            this.add.text(100, 180, `Level: ${data.playerStats.level}`, { fontSize: '24px', color: '#fff' });
            this.add.text(100, 210, `Treats Collected: ${data.playerStats.treats}`, { fontSize: '24px', color: '#fff' });

            this.add.text(100, 300, `Press SPACE to return`, { fontSize: '24px', color: '#fff' });

            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('GameScene');
            });
        }
    }
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: [BootScene, GameScene, BattleScene]
    };

    const playerStats = {
        hp: 100,
        level: 1,
        xp: 0,
        treats: 0
    };

    new Phaser.Game(config);