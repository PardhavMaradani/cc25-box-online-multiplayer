const { Server } = require("socket.io");
const { join } = require("node:path");
const { createServer } = require("node:http");
const { parseArgs } = require("node:util");
const express = require("express");

const params = {};

function showUsageAndExit(retVal) {
    const usage =
        "Usage: npm start -- [-p <port>] [-m <min_rr_players>] [-t <round_timeout>] [-v] [-h]\n" +
        "Options:\n" +
        "    -p|--port         : port number that server will listen on (default: 5000)\n" +
        "    -m|--minRRPlayers : minimum number of players to start a round-robin (default: 2)\n" +
        "    -t|--roundTimeout : per round timeout in seconds (default: 30)\n" +
        "    -v|--verbose      : show verbose output (default: false)\n" +
        "    -d|--debug        : show debug output (default: false)\n" +
        "    -h|--help         : show usage\n";
    console.log(usage);
    process.exit(retVal);
}

function vlog(...args) {
    if (params.verbose) {
        console.log(Date.now(), ...args);
    }
}

function dlog(...args) {
    if (params.debug) {
        console.debug(Date.now(), ...args);
    }
}

function clog(...args) {
    console.log(Date.now(), ...args);
}

function cerror(...args) {
    console.error(Date.now() + "", ...args);
}

try {
    const options = {
        port: {
            type: "string",
            short: "p",
            default: "5000"
        },
        minRRPlayers: {
            type: "string",
            short: "m",
            default: "2"
        },
        roundTimeout: {
            type: "string",
            short: "t",
            default: "30"
        },
        verbose: {
            type: "boolean",
            short: "v",
            default: false
        },
        debug: {
            type: "boolean",
            short: "d",
            default: false
        },
        help: {
            type: "boolean",
            short: "h",
            default: false
        }
    };
    const { values } = parseArgs({ options, allowPositionals: false });
    if (values["help"]) {
        showUsageAndExit(0);
    }
    const port = Number(values["port"]);
    if (isNaN(port) || port < 0) {
        throw new Error("Port needs to be a number >= 0");
    }
    params.port = port;
    const minRRPlayers = Number(values["minRRPlayers"]);
    if (isNaN(minRRPlayers) || minRRPlayers < 2) {
        throw new Error("Minimum number of players to start a round-robin needs to be a number >= 2");
    }
    params.minRRPlayers = minRRPlayers;
    const roundTimeout = Number(values["roundTimeout"]);
    if (isNaN(roundTimeout) || roundTimeout < 1) {
        throw new Error("Per round timeout (in seconds) needs to be a number >= 1");
    }
    params.roundTimeout = roundTimeout;
    params.verbose = values["verbose"] || false;
    params.debug = values["debug"] || false;
    if (params.debug) {
        params.verbose = true;
    }
    vlog("params :", params);
} catch (error) {
    console.error(error.message);
    showUsageAndExit(1);
}

const app = express();
const httpServer = createServer(app);
const server = new Server(httpServer);

httpServer.on("error", (error) => {
    cerror("Error starting server :", error.message);
    process.exit(1);
});
app.use("/js", express.static("js"));
app.use("/css", express.static("css"));
app.use("/css", express.static(join(__dirname, "node_modules/bootstrap/dist/css")));
app.use("/js", express.static(join(__dirname, "node_modules/bootstrap/dist/js")));
app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
});
httpServer.listen(params.port, () => {
    clog("Server is listening on port", httpServer.address().port);
});

const state = {
    players: {},
    socket2Player: {},
    rrN: 1,
    nDone: 0,
    rrInProgress: false,
    upSince: Date.now()
};

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

function sixShuffle() {
    return shuffle([1, 2, 3, 4, 5, 6]);
}

function checkCurrentRoundDone() {
    if (state.rr.rounds[state.rr.currentRound].nDone == state.rr.gamesPerRound) {
        vlog("RR", state.rr.rrN, "round", state.rr.currentRound, "done");
        clearTimeout(state.rr.roundTimeout);
        state.rr.currentRound++;
        if (state.rr.currentRound < state.rr.nRounds) {
            // more rounds left
            uiEmitStatus();
            setNewRoundTimeout();
        } else {
            // all rounds done
            state.rrInProgress = false;
            vlog("RR", state.rr.rrN, "done :", state.rr.nDone, "/", state.rr.nGames, "games completed");
            vlog(state.nDone, "total games completed");
            emitNewSchedule();
        }
    }
}

function setNewRoundTimeout() {
    state.rr.roundTimeout = setTimeout(() => {
        if (state.rr.rounds[state.rr.currentRound].nDone == state.rr.gamesPerRound) {
            cerror("RR", state.rr.rrN, "round", state.rr.currentRound, "timedout, but all games done");
            checkCurrentRoundDone();
            return;
        }
        vlog("RR", state.rr.rrN, "round", state.rr.currentRound, "timedout");
        // mark players who didn't show up for their games as not in RR anymore
        const gS = state.rr.currentRound * state.rr.gamesPerRound;
        for (let i = gS; i < gS + state.rr.gamesPerRound; i += 2) {
            const game = state.rr.games[i];
            if (!game.p1.ready && validRRPlayer(game.p1.name)) {
                state.players[game.p1.name].inRR = false;
                vlog("Player", game.p1.name, "did'nt show up for game", i, "in round", state.rr.currentRound);
            }
            if (!game.p2.ready && validRRPlayer(game.p2.name)) {
                state.players[game.p2.name].inRR = false;
                vlog("Player", game.p2.name, "did'nt show up for game", i, "in round", state.rr.currentRound);
            }
        }
        server.emit("round:timeout", state.rr.rrN, state.rr.currentRound);
        state.rr.rounds[state.rr.currentRound].nDone = state.rr.gamesPerRound;
        checkCurrentRoundDone();
    }, params.roundTimeout * 1000);
    vlog("RR", state.rr.rrN, "round", state.rr.currentRound, "timeout set for", params.roundTimeout, "seconds");
}

function generateRR() {
    state.rr = {};
    state.rr.rounds = [];
    state.rr.games = {};
    state.rr.schedule = {};
    state.rr.rrN = state.rr.schedule.rrN = state.rrN++;
    state.rr.schedule.rounds = [];
    const bye = "<bye>";
    let pNames = shuffle(Object.keys(state.players));
    if (pNames.length % 2 != 0) {
        pNames.push(bye);
    }
    const n = pNames.length;
    let nGames = 0;
    for (let r = 0; r < n - 1; r++) {
        let roundMatches = [];
        for (let m = 0; m < n / 2; m++) {
            const p1 = pNames[m];
            const p2 = pNames[n - 1 - m];
            if (p1 != bye && p2 != bye) {
                roundMatches.push({ p1: p1, p2: p2 });
                state.rr.games[nGames++] = { round: r, p1: { name: p1, ready: false }, p2: { name: p2, ready: false }, nReady: 0, nDone: 0 };
                state.rr.games[nGames++] = { round: r, p1: { name: p2, ready: false }, p2: { name: p1, ready: false }, nReady: 0, nDone: 0 };
            }
        }
        state.rr.rounds.push({ nDone: 0 });
        state.rr.schedule.rounds.push(roundMatches);
        pNames = [pNames[0]].concat([pNames[n - 1]]).concat(pNames.slice(1, n - 1));
    }
    for (const player in state.players) {
        state.players[player].inRR = true;
    }
    state.rr.nPlayers = Object.keys(state.players).length;
    state.rr.nRounds = n - 1;
    state.rr.nGames = nGames;
    state.rr.nDone = 0;
    state.rr.gamesPerRound = 2 * Math.floor(state.rr.nPlayers / 2);
    state.rr.currentRound = 0;
    state.rr.tsStart = Date.now();
    state.rr.tsEnd = state.rr.tsStart + (state.rr.nRounds * params.roundTimeout * 1000);
    vlog("Generated new round-robin", state.rr.rrN, "with", state.rr.nRounds, "rounds between", state.rr.nPlayers, "players");
    dlog("generateRR :", JSON.stringify(state.rr, null, 2));
}

function validRRPlayer(player) {
    return (state.players[player] && state.players[player].inRR);
}

function invalidGameId(gameId) {
    return (gameId == null || isNaN(gameId) || gameId < 0 || gameId >= state.rr.nGames);
}

function emitPlayers(socket) {
    const players = Object.keys(state.players);
    if (socket) {
        server.to(socket.id).emit("players", players);
    } else {
        server.emit("players", players);
        vlog("Players :", players);
    }
}

function uiEmitStatus() {
    const status = {
        rrInProgress: state.rrInProgress,
        mPlayers: params.minRRPlayers,
        upSince: state.upSince,
        tDone: state.nDone,
        rrN: state.rrN,
    };
    if (state.rrInProgress) {
        status.rrN = state.rr.rrN;
        status.nPlayers = state.rr.nPlayers;
        status.nRounds = state.rr.nRounds;
        status.nGames = state.rr.nGames;
        status.nDone = state.rr.nDone;
        status.currentRound = state.rr.currentRound;
        status.tsStart = state.rr.tsStart;
        status.tsEnd = state.rr.tsEnd;
    }
    server.emit("status", status);
}

function emitNewSchedule() {
    if (state.rrInProgress) {
        vlog("emitNewSchedule: round-robin already in progress");
        return;
    }
    if (Object.keys(state.players).length < params.minRRPlayers) {
        vlog("emitNewSchedule: not enough players to start a new round-robin");
        uiEmitStatus();
        return;
    }
    generateRR();
    state.rrInProgress = true;
    server.emit("schedule", state.rr.schedule);
    uiEmitStatus();
    setNewRoundTimeout();
}

server.on("connection", (socket) => {
    vlog("Client connected");
    emitPlayers(socket);
    uiEmitStatus();
    socket.on("disconnect", (reason, details) => {
      const player = state.socket2Player[socket.id];
      if (player) {
        delete state.players[player];
        delete state.socket2Player[socket.id];
        vlog("Player", player, "disconnected");
        emitPlayers();
      } else {
          vlog("Client disconnected");
      }
    });
    socket.on("session:start", (player, ack) => {
        if (!(ack instanceof Function)) {
            cerror("session:start - ack not a function", ack);
            return;
        }
        const nPlayers = Object.keys(state.players).length;
        if (nPlayers == 128) {
            ack({ status: "error", message: "Too many players" });
            cerror("session:start - Too many players");
            return;
        }
        if (player == null || !/^[\w\-.]+$/.test(player) || player.length > 32) {
            ack({ status: "error", message: "Invalid player name" });
            cerror("session:start - Invalid player name", player);
            return;
        }
        state.players[player] = { inRR: false };
        state.socket2Player[socket.id] = player;
        vlog("Session started for player", player);
        ack({ status: "ok" });
        emitPlayers();
        if (nPlayers + 1 == params.minRRPlayers) {
            emitNewSchedule();
        }
    });
    socket.on("session:stop", (ack) => {
        if (!(ack instanceof Function)) {
            cerror("session:stop - ack not a function", ack);
            return;
        }
        const player = state.socket2Player[socket.id];
        if (player) {
            delete state.players[player];
            delete state.socket2Player[socket.id];
            ack({ status: "ok" });
            vlog("Session stopped for player", player);
            emitPlayers();
        } else {
            ack({ status: "error", message: "Player not found" });
            cerror("session:stop - Player not found");
        }
    });
    socket.on("game:ready", (rrN, gameId, ack) => {
        if (!(ack instanceof Function)) {
            cerror("game:ready - ack not a function", ack);
            return;
        }
        if (rrN != state.rr.rrN) {
            ack({ status: "error", message: "Invalid round-robin" });
            cerror("game:ready - Invalid round-robin", rrN, state.rr.rrN);
            return;
        }
        if (invalidGameId(gameId)) {
            ack({ status: "error", message: "Invalid game Id" });
            cerror("game:ready - Invalid game Id", gameId);
            return;
        }
        const game = state.rr.games[gameId];
        const player = state.socket2Player[socket.id];
        if (game.p1.name != player && game.p2.name != player) {
            ack({ status: "error", message: "Player not in game" });
            cerror("game:ready - Player not in game", player, game.p1.name, game.p2.name);
            return;
        }
        if (!validRRPlayer(player)) {
            ack({ status: "error", message: "Not in round-robin" });
            cerror("game:ready - Not in round-robin", player);
            return;
        }
        if (game.p1.name == player) {
            game.p1.ready = true;
        } else {
            game.p2.ready = true;
        }
        const opponent = (game.p1.name == player) ? game.p2.name : game.p1.name;
        if (!validRRPlayer(opponent)) {
            ack({ status: "error", message: "Opponent not in round-robin" });
            cerror("game:ready - Opponent not in round-robin for", player, "vs", opponent);
            // mark game as done to avoid a full timeout
            state.rr.rounds[game.round].nDone++;
            return;
        }
        game.nReady++;
        if (game.nReady == 1) {
            game.firstSocket = socket.id;
            ack({ status: "wait" });
        } else if (game.nReady == 2) {
            game.secondSocket = socket.id;
            ack({ status: "ready" });
            server.to(game.firstSocket).emit("opponent:ready", rrN, gameId);
            server.to(socket.id).emit("opponent:ready", rrN, gameId);
            // send secret colors
            let sc = sixShuffle();
            server.to(game.firstSocket).emit("game:move", sc[0].toString());
            server.to(socket.id).emit("game:move", sc[1].toString());
            // send starting tile
            let st = "Hh" + sixShuffle().join('') + "h";
            server.to(game.firstSocket).emit("game:move", st);
            server.to(socket.id).emit("game:move", st);
            // send start and input tile
            if (game.p1.name == player) {
                server.to(socket.id).emit("game:move", "Start");
                server.to(socket.id).emit("game:move", sixShuffle().join(''));
            } else {
                server.to(game.firstSocket).emit("game:move", "Start");
                server.to(game.firstSocket).emit("game:move", sixShuffle().join(""));
            }
        } else {
            ack({ status: "error", message: "Invalid game" });
            cerror("game:ready - game.nReady > 2");
        }
    });
    socket.on("game:move", (rrN, gameId, move) => {
        if (rrN != state.rr.rrN) {
            cerror("game:move - Invalid round-robin", rrN, state.rr.rrN);
            return;
        }
        if (invalidGameId(gameId)) {
            cerror("game:move - Invalid game Id", gameId);
            return;
        }
        if (!/^[A-P][a-t][1-6]{6}[hv]$/.test(move)) {
            cerror("game:move - Invalid move", move);
            return;
        }
        // send move and new tile colors to the other player
        const game = state.rr.games[gameId];
        if (socket.id == game.firstSocket) {
            server.to(game.secondSocket).emit("game:move", move);
            server.to(game.secondSocket).emit("game:move", sixShuffle().join(""));
        } else if (socket.id == game.secondSocket) {
            server.to(game.firstSocket).emit("game:move", move);
            server.to(game.firstSocket).emit("game:move", sixShuffle().join(""));
        } else {
            cerror("game:move - socket.id not in game", socket.id, game);
            return;
        }
    });
    socket.on("game:done", (rrN, gameId, color, score) => {
        if (rrN != state.rr.rrN) {
            cerror("game:done - Invalid round-robin", rrN, state.rr.rrN);
            return;
        }
        if (invalidGameId(gameId)) {
            cerror("game:done - Invalid game Id", gameId);
            return;
        }
        // send opp color and score to the other player
        const game = state.rr.games[gameId];
        if (socket.id == game.firstSocket) {
            server.to(game.secondSocket).emit("game:done", color, score);
        } else if (socket.id == game.secondSocket) {
            server.to(game.firstSocket).emit("game:done", color, score);
        } else {
            cerror("game:done - socket.id not in game", socket.id, game);
            return;
        }
        const player = state.socket2Player[socket.id];
        game.nDone++;
        if (game.nDone == 2) {
            state.rr.rounds[game.round].nDone++;
            state.rr.nDone++;
            state.nDone++;
            checkCurrentRoundDone();
        }
    });
});
