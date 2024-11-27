2D RPG Game
*********************************************************************************************************************************
A browser-based 2D RPG game featuring exploration, combat, and an engaging storyline. This project is developed using JavaScript, HTML, and CSS, with a Node.js server backend.

Prerequisites:

-Node.js (v14 or higher)

-HTTP Server(Apache,Nginx etc)

-SQLite3

-A web browser (Chrome, Firefox, etc.)

Installation:

1.Clone the repository:

                      git clone https://github.com/FASALURAHMANMK/2DRPG.git

2.Move "2DRPG" folder to the http server root folder (ie. "htdocs")

3.Navigate to the project directory:

                      cd 2DRPG

4.Install dependencies:
 
                      npm install
5.Start the server:

                      node server.js

6.Open the game in your browser at http://[Your ip or localhost]/2DRPG/

Usage:

-Login with the default accounts([user1:1234],[user2:1234]) or use sign up to create your own.

-After login create a game room

-You can join room from there itself(Single Player) or join from another logged in user. Then start the game.

-Navigate using arrow keys and collect coins

-The game ends when all coins are collected and the winner is whom with more coins.

-Press "Space" to restart the game.

File Structure:

/assets: Game sprites, tilesets.

Game.js: Core game logic.

server.js: Backend server for handling realtime updates.

game.db: SQLite database for saving user data.

License:

This project is licensed under the MIT License.
*********************************************************************************************************************************