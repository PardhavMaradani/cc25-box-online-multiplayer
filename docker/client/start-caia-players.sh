#!/bin/sh

node index.js -s http://server:5000 -p caia-player1 -x -f -a "$@" &
node index.js -s http://server:5000 -p caia-player2 -x -f -a "$@" &
node index.js -s http://server:5000 -p caia-player3 -x -f -a "$@"
