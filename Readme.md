2D RPG Game
*********************************************************************************************************************************
A browser-based 2D RPG game featuring exploration, combat, and an engaging storyline. This project is developed using JavaScript, HTML, and CSS, with a Node.js server backend.

Prerequisites:

Node.js (v14 or higher)
SQLite3
A modern web browser (Chrome, Firefox, etc.)

Installation:

1.Clone the repository:

                      git clone https://github.com/FASALURAHMANMK/2DRPG.git

2.Navigate to the project directory:

                      cd 2DRPG

3.Install dependencies:
 
                      npm install
4.Start the server:

node server.js

5.Open the game in your browser at http://localhost:3008.

Usage
-Login with the default accounts([user1:1234],[user2:1234]) or use sign up to create your own.
-After login create a game room
-You can join room from there itself(Single Player) or join from another logged in user. Then start the game.
-Navigate using arrow keys
-The aim is to collect more coins
-The game ends when the coins are finished and the winner is who with more coins.
-Press "Space" to restart the game.

File Structure

/assets: Game sprites, tilesets.
Game.js: Core game logic.
server.js: Backend server for handling data persistence.
game.db: SQLite database for saving game data.

License
This project is licensed under the MIT License.
*********************************************************************************************************************************