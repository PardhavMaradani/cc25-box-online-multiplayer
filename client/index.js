import { Server } from 'socket.io';
import { join, basename } from 'node:path';
import { createServer } from 'node:http';
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import Client from 'socket.io-client';
import serveIndex from 'serve-index';
import express from 'express';
import fs from 'node:fs';

const params = {};

function showUsageAndExit(retVal) {
    const usage =
      "Usage: npm start -- -s <server_url> -p <program> [-n <player_name>] [-e <passphrase>] [-t <server_timeout>] [-u <ui_port>] [-x] [-f] [-a] [-v] [-h]\n" +
      "Options:\n" +
      "  Required:\n" +
      "    -s|--serverURL     : server URL (required)\n" +
      "    -p|--program       : program to run (required)\n" +
      "  Optional:\n" +
      "    -n|--playerName    : player name (default: program name)\n" +
      "    -e|--passphrase    : register player name for exclusive use (default: none)\n" +
      "    -t|--serverTimeout : timeout in seconds for server socket (default: 5 seconds)\n" +
      "    -u|--uiPort        : port number to listen for UI (default: 3000)\n" +
      "    -m|--maxGamesInUI  : max completed games to list in UI (default: 512)\n" +
      "    -x|--noUI          : do not listen on UI port (default: false)\n" +
      "    -f|--noFiles       : do not create HTML files for completed games (default: false)\n" +
      "    -a|--autoStart     : start a session automatically (default: false)\n" +
      "    -v|--verbose       : show verbose output (default: false)\n" +
      "    -d|--debug         : show debug output (default: false)\n" +
      "    -h|--help          : show usage\n";
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
        serverURL: {
            type: "string",
            short: "s"
        },
        program: {
            type: "string",
            short: "p"
        },
        playerName: {
            type: "string",
            short: "n"
        },
        passphrase: {
            type: "string",
            short: "e"
        },
        serverTimeout: {
            type: "string",
            short: "t",
            default: "5"
        },
        uiPort: {
            type: "string",
            short: "u",
            default: "3000"
        },
        maxGamesInUI: {
            type: "string",
            short: "m",
            default: "512"
        },
        noUI: {
            type: "boolean",
            short: "x",
            default: false
        },
        autoStart: {
            type: "boolean",
            short: "a",
            default: false
        },
        noFiles: {
            type: "boolean",
            short: "f",
            default: false
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
    const serverURL = values["serverURL"];
    if (!serverURL) {
        throw new Error("Server URL is required");
    }
    if (!/(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/.test(serverURL)) {
        throw new Error("Invalid Server URL '" + serverURL + "'");
    }
    params.serverURL = serverURL;
    const program = values["program"];
    if (!program) {
        throw new Error("Program to run is required");
    }
    if (!fs.existsSync(program)) {
        throw new Error("Program '" + program + "' does not exist");
    }
    try {
        fs.accessSync(program, fs.constants.X_OK);
    } catch (error) {
        throw new Error("Program '" + program + "' is not executable");
    }
    const programBasename = basename(program);
    if (!/^[\w\-.]+$/.test(programBasename)) {
        throw new Error("Invalid program name '" + programBasename + "'");
    }
    params.program = program;
    params.programBasename = programBasename;
    if (values["playerName"]) {
        const playerName = values["playerName"];
        if (!/^[\w\-.]+$/.test(playerName)) {
            throw new Error("Invalid player name '" + playerName + "' - need (^[\w-.]+$)");
        }
        params.playerName = playerName;
    } else {
        params.playerName = programBasename;
    }
    params.passphrase = values["passphrase"];
    if (params.passphrase != null) {
        params.passphrase = crypto.createHash("sha256").update(params.passphrase).digest("hex");
    } else {
        console.error("Warning: No passphrase provided - player name may be used by others too, see -h for help");
    }
    const serverTimeout = Number(values["serverTimeout"]);
    if (isNaN(serverTimeout) || serverTimeout < 0) {
        throw new Error("Server socket timeout needs to be a number >= 0");
    }
    const uiPort = Number(values["uiPort"]);
    if (isNaN(uiPort) || uiPort < 0) {
        throw new Error("UI port needs to be a number >= 0");
    }
    const maxGamesInUI = Number(values["maxGamesInUI"]);
    if (isNaN(maxGamesInUI) || maxGamesInUI < 1) {
        throw new Error("Max games to list in UI needs to be a number > 0");
    }
    params.serverTimeout = serverTimeout;
    params.uiPort = uiPort;
    params.maxGamesInUI = maxGamesInUI;
    params.noUI = values["noUI"] || false;
    params.autoStart = values["autoStart"] || false;
    params.noFiles = values["noFiles"] || false;
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

const state = {
    serverConnected: false,
    autoStart: params.autoStart,
    playerName: params.playerName,
    players: {},
    leaderboard: {},
    completedGames: [],
    nCompletedGames: 0,
    serverStatus: null
};

const gameState = {};

const app = express();
const uiServer = createServer(app);
const ui = new Server(uiServer);
const serverSocket = Client.connect(params.serverURL, { reconnect: true });
const boxGameTemplateHTML = fs.readFileSync("boxGameTemplate.html", "utf8");

function clearSessionState() {
    state.inSession = false;
    state.startSessionInProgress = false;
    state.scheduledMatches = [];
    state.upcomingGames = [];
    uiEmitSessionStatus();
}

function clearGameState() {
    stopProgram();
    gameState.game = null;
    gameState.program = null;
    gameState.moves = [];
    gameState.logs = "";
    gameState.myColor = 0;
    gameState.myScore = 0;
    gameState.noMovesLeft = false;
    gameState.inputTileColors = "";
    gameState.board = Array(16);
    gameState.pp = Array(16);
    for (let i = 0; i < 16; i++) {
        gameState.board[i] = Array(20);
        gameState.pp[i] = Array(20);
        for (let j = 0; j < 20; j++) {
            gameState.board[i][j] = 0;
            gameState.pp[i][j] = [false, false];
        }
    }
    uiEmitGameStatus();
}

function clearSessionAndGameState() {
    clearSessionState();
    clearGameState();
}

function duplicatePlayerName(playerName) {
    return Object.keys(state.players).includes(playerName);
}

function startSession(ack) {
    if (state.startSessionInProgress) {
        ack({ status: "duplicate" });
        cerror("startSession duplicate request");
        return;
    }
    state.startSessionInProgress = true;
    serverSocket.timeout(params.serverTimeout * 1000).emit("session:start:v2", state.playerName, params.passphrase, (timeoutError, response) => {
        if (timeoutError) {
            ack({ status: "error", message: timeoutError.message });
            cerror("startSession timeout :", timeoutError.message);
        } else {
            if (response.status == "ok") {
                const date = new Date();
                state.sessionFolderName = date.toDateString().replace(/ /g, "-") + "-" + date.toLocaleTimeString().replace(/:| /g, "-");
                state.sessionFolderPath = join(import.meta.dirname, "all-games", params.programBasename, state.sessionFolderName);
                state.inSession = true;
                ack({ status: "ok" });
                vlog("Session started for player", state.playerName);
                uiEmitSessionStatus();
            } else {
                cerror("startSession error :", response.message);
                ack({ status: "error", message: response.message });
            }
        }
        state.startSessionInProgress = false;
    });
}

function stopSession(ack) {
    clearSessionAndGameState();
    serverSocket.timeout(params.serverTimeout * 1000).emit("session:stop", (timeoutError, response) => {
        if (timeoutError) {
            ack({ status: "error", message: timeoutError.message });
            cerror("stopSession timeout :", timeoutError.message);
        } else {
            if (response.status == "ok") {
                ack({ status: "ok" });
                vlog("Session stopped for player", state.playerName);
            } else {
                ack({ status: "error", message: response.message });
                cerror("stopSession error :", response.message);
            }
        }
    });
}

function getBoxGameHTML(data) {
    return boxGameTemplateHTML.replace(/{(\w*)}/g,
        function(m, key){
            return data.hasOwnProperty(key) ? data[key] : "";
        }
    );
}

function gameWriteHTML(score, oppColor, oppScore) {
    const game = gameState.game;
    let gs = "rr-" + game.rrN + "-r-" + (game.round + 1) + "-p-" + game.p;
    let p1c = (game.p == 1) ? gameState.myColor : oppColor;
    let p2c = (game.p == 1) ? oppColor : gameState.myColor;
    let p1r;
    let p2r;
    if (gameState.myScore == oppScore) {
        p1r = "_DRAW";
        p2r = "_DRAW";
        gs += "-d-";
    } else {
        if (gameState.myScore > oppScore) {
            p1r = (game.p == 1) ? "_WIN" : "_LOSE";
            p2r = (game.p == 1) ? "_LOSE" : "_WIN";
            gs += "-w-";
        } else {
            p1r = (game.p == 1) ? "_LOSE" : "_WIN";
            p2r = (game.p == 1) ? "_WIN" : "_LOSE";
            gs += "-l-";
        }
    }
    let data = {
        players: game.p1 + " - " + game.p2,
        game: gs,
        moves: JSON.stringify(gameState.moves),
        p1r: p1r,
        p2r: p2r,
        score: score,
        p1: game.p1,
        p2: game.p2,
        p1c: p1c,
        p2c: p2c,
        logs: gameState.logs
    };
    const gameHTML = join(state.sessionFolderPath, gs + "o-" + game.opponent + ".html");
    try {
        if (!fs.existsSync(state.sessionFolderPath)) {
            fs.mkdirSync(state.sessionFolderPath, { recursive: true });
        }
        fs.writeFileSync(gameHTML, getBoxGameHTML(data));
    } catch (error) {
        cerror(error.message);
    }
}

function gameRemainingMoves() {
    let nMoves = 0;
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 20; j++) {
            for (let d = 0; d < 2; d++) {
                if (gameState.pp[i][j][d]) {
                    nMoves++;
                }
            }
        }
    }
    return nMoves;
}

function gameCountSquares(r, c, delta) {
    const myColor = gameState.myColor;
    const board = gameState.board;
    if (board[r][c] != myColor) {
        return 0;
    }
    let score = 0;
    for (let i = 1; i <= c; i++) {
        if (myColor != board[r][c - i]) {
            continue;
        }
        if (i <= r && myColor == board[r - i][c] && myColor == board[r - i][c - i]) {
            score += delta * i;
        }
        if (r + i < 16 && myColor == board[r + i][c] && myColor == board[r + i][c - i]) {
            score += delta * i;
        }
    }
    for (let i = 1; c + i < 20; i++) {
        if (myColor != board[r][c + i]) {
            continue;
        }
        if (i <= r && myColor == board[r - i][c] && myColor == board[r - i][c + i]) {
            score += delta * i;
        }
        if (r + i < 16 && myColor == board[r + i][c] && myColor == board[r + i][c + i]) {
            score += delta * i;
        }
    }
    return score;
}

function gameCalcScore(r, c, color) {
    const board = gameState.board;
    if (color == board[r][c]) {
        return;
    }
    if (board[r][c] != 0) {
        gameState.myScore += gameCountSquares(r, c, -1);
    }
    board[r][c] = color;
    gameState.myScore += gameCountSquares(r, c, 1);
}

function gameUpdatePP(r, c, d) {
    for (let k = 0; k < 2; k++) {
        const sr = (k == 0) ? r - 2 : r - 6;
        const sc = (k == 0) ? c - 6 : c - 2;
        let nr = (k == 0) ? 5 : 9;
        let nc = (k == 0) ? 13 : 9;
        if (d == 'v') {
            nr = (k == 0) ? 9 : 13;
            nc = (k == 0) ? 9 : 5;
        }
        const ARB = (k == 0) ? 15 : 11;
        const ACB = (k == 0) ? 15 : 19;
        const NII = (k == 0) ? 2 : 6;
        const NJJ = (k == 0) ? 6 : 2;
        for (let i = 0; i < nr; i++) {
            for (let j = 0; j < nc; j++) {
                if ((i == 0 && (j == 0 || j == nc - 1)) ||
                    (i == nr - 1 && (j == 0 || j == nc - 1))) {
                    continue;
                }
                const ar = sr + i;
                const ac = sc + j;
                if (ar < 0 || ar >= ARB || ac < 0 || ac >= ACB) {
                    continue;
                }
                let overlaps = 0;
                for (let ii = 0; ii < NII; ii++) {
                    for (let jj = 0; jj < NJJ; jj++) {
                        if (gameState.board[ar + ii][ac + jj]) {
                            overlaps++;
                        }
                    }
                }
                gameState.pp[ar][ac][k] = overlaps <= 4;
            }
        }
    }
}

function gamePlaceTile(tile) {
    const r = tile[0].charCodeAt() - 65;
    const c = tile[1].charCodeAt() - 97;
    let r1 = tile.charCodeAt(0) - 65;
    let r2 = r1 + (tile[8] === 'v' ? 6 : 2);
    let c1 = tile.charCodeAt(1) - 97;
    let c2 = c1 + (tile[8] !== 'v' ? 6 : 2);
    for (let i = 0; i < 6; i++) {
        const color = tile[2 + i].charCodeAt() - 48;
        if (tile[8] === 'v') {
            gameCalcScore(r1 + i, c1 + 1, color);
            gameCalcScore(r1 + 5 - i, c1, color);
        } else {
            gameCalcScore(r1, c1 + i, color);
            gameCalcScore(r1 + 1, c1 + 5 - i, color);
        }
    }
    gameUpdatePP(r, c, tile[8]);
}

function sendGameReady() {
    const rrN = gameState.game.rrN;
    const round = gameState.game.round;
    const gameId = gameState.game.id;
    vlog("Sending game ready : RR", rrN, "round", round, "gameId", gameId, "vs", gameState.game.opponent);
    serverSocket.timeout(params.serverTimeout * 1000).emit("game:ready", rrN, gameId, (timeoutError, response) => {
        if (timeoutError) {
            cerror("sendGameReady timeout :", timeoutError.message);
        } else {
            if (response.status == "error") {
                cerror("sendGameReady server error :", response.message);
                beginNewGame();
            } else if (response.status == "wait") {
                vlog("Waiting for opponent to be ready ...");
            } else if (response.status == "ready") {
            }
        }
    });
}

function stopProgram() {
    if (gameState.program != null) {
        gameState.program.kill();
        gameState.program = null;
        vlog("Program stopped");
    }
}

function startProgram() {
    gameState.program = spawn(params.program, { env: { PATH: "./" } });
    const program = gameState.program;
    program.on("spawn", () => {
        vlog("Program started");
        sendGameReady();
    });
    program.on("exit", (code, signal) => {
    });
    program.stdin.on("error", (...args) => {
    });
    program.stdout.on("error", (...args) => {
    });
    program.stderr.on("data", (data) => {
        if (!params.noFiles) {
            gameState.logs += data.toString();
        }
    });
    program.stdout.on("data", (data) => {
        if (!(gameState.game && gameState.game.inProgress)) {
            cerror("program:stdout - game not in progress");
            return;
        }
        const move = data.toString().trim();
        // TODO: this move is not validated
        const tile = move.slice(0, 2) + gameState.inputTileColors + move.slice(2);
        gamePlaceTile(tile);
        gameState.moves.push(tile);
        const game = gameState.game;
        serverSocket.emit("game:move", game.rrN, game.id, tile);
        if (gameRemainingMoves() == 0) {
            vlog("gameId", game.id, "complete");
            stopProgram();
            gameState.noMovesLeft = true;
            serverSocket.emit("game:done", game.rrN, game.id, gameState.myColor, gameState.myScore);
            return;
        }
    });
}

function beginNewGame() {
    clearGameState();
    if (state.upcomingGames.length == 0) {
        vlog("All games done - waiting for next round-robin ...")
        state.scheduledMatches = [];
        uiEmitSessionStatus();
        return;
    }
    gameState.game = state.upcomingGames.shift();
    startProgram();
    uiEmitGameStatus();
}

clog("Server URL is", params.serverURL);
if (!params.noUI) {
    uiServer.on("error", (error) => {
        cerror("Error starting UI server :", error.message);
        process.exit(1);
    });
    app.use("/js", express.static("js"));
    app.use("/css", express.static("css"));
    app.use("/css", express.static(join(import.meta.dirname, "node_modules/bootstrap/dist/css")));
    app.use("/js", express.static(join(import.meta.dirname, "node_modules/bootstrap/dist/js")));
    app.use("/all-games", express.static("all-games"), serveIndex(join(import.meta.dirname, "all-games"), {"icons": true}));
    app.get("/", (req, res) => {
        res.sendFile(join(import.meta.dirname, "index.html"));
    });
    uiServer.listen(params.uiPort, () => {
        clog("UI available at http://localhost:" + uiServer.address().port);
    });
}

serverSocket.on("connect", () => {
    state.serverConnected = true;
    clearSessionAndGameState();
    uiEmitServerConnected();
    clog("Connected to server", params.serverURL);
});

serverSocket.on("connect_error", (error) => {
    if (serverSocket.active) {
        cerror("Connecting to server", params.serverURL, "...");
    } else {
        cerror("Error connecting to server :", error.message);
        process.exit(1);
    }
});

serverSocket.on("disconnect", (reason, details) => {
    state.serverConnected = false;
    clearSessionAndGameState();
    uiEmitServerConnected();
    cerror("Disconnected from server", params.serverURL);
});

serverSocket.on("players:online", (players) => {
    state.players = players;
    uiEmitPlayersOnline();
    vlog("Players online :", state.players);
    if (state.autoStart && !state.inSession && !state.startSessionInProgress) {
        if (duplicatePlayerName(state.playerName)) {
            cerror("Duplicate player name", state.playerName, "- please choose another name");
            process.exit(1);
        }
        startSession((response) => {
            if (response.status == "ok") {
                vlog("Session auto started");
                vlog("Waiting for next round-robin ...");
            } else if (response.status == "error") {
                process.exit(1);
            }
        });
    }
});

serverSocket.on("leaderboard", (leaderboard) => {
    state.leaderboard = leaderboard;
    uiEmitLeaderboard();
    vlog("Leaderboard :", state.leaderboard);
});

serverSocket.on("schedule", (schedule) => {
    if (!state.inSession) {
        return;
    }
    state.scheduledMatches = [];
    state.upcomingGames = [];
    let nGames = 0;
    const rounds = schedule.rounds;
    for (let r = 0; r < rounds.length; r++) {
        for (let m = 0; m < rounds[r].length; m++) {
            const match = rounds[r][m];
            const id = nGames;
            if (Object.values(match).includes(state.playerName)) {
                const opponent = (match.p1 == state.playerName) ? match.p2 : match.p1;
                state.scheduledMatches.push({ rrN: schedule.rrN, round: r, opponent: opponent });
                const p = (match.p1 == state.playerName) ? 1 : 2;
                const SMRow = state.scheduledMatches.length - 1;
                state.upcomingGames.push({ id: id, rrN: schedule.rrN, round: r, tr: rounds.length, p1: match.p1, p2: match.p2, opponent: opponent, g: 1, p: p, inProgress: false, SMRow: SMRow });
                state.upcomingGames.push({ id: id + 1, rrN: schedule.rrN, round: r, tr: rounds.length, p1: match.p2, p2: match.p1, opponent: opponent, g: 2, p: (p == 1) ? 2 : 1, inProgress: false, SMRow: SMRow });
            }
            nGames += 2;
        }
    }
    vlog("Received new round-robin", schedule.rrN, "with", rounds.length, "rounds and", nGames, "games");
    dlog("schedule :", JSON.stringify(schedule, null, 2));
    dlog("scheduledMatches :", state.scheduledMatches);
    dlog("upcomingGames :", state.upcomingGames);
    uiEmitSessionStatus();
    beginNewGame();
});

serverSocket.on("status", (status) => {
    state.serverStatus = status;
    uiEmitServerStatus();
});

serverSocket.on("opponent:ready", (rrN, gameId) => {
    vlog("opponent:ready - RR", rrN, "gameId", gameId);
    if (gameState.game && gameState.game.rrN == rrN && gameState.game.id == gameId) {
        gameState.game.inProgress = true;
        vlog("gameId", gameId, "in progress ...");
        uiEmitGameStatus();
    } else {
        cerror("opponent:ready - rrN", rrN, "gameId", gameId, "not current game");
    }
});

serverSocket.on("game:move", (move) => {
    if (!(gameState.game && gameState.game.inProgress)) {
        cerror("game:move - game not in progress");
        return;
    }
    if (gameState.noMovesLeft) {
        return;
    }
    if (move.length == 1) {
        gameState.myColor = move.charCodeAt() - 48;
    } else if (move.length == 9) {
        gamePlaceTile(move);
        gameState.moves.push(move);
        if (gameRemainingMoves() == 0) {
            vlog("gameId", gameState.game.id, "complete");
            gameState.noMovesLeft = true;
            stopProgram();
            serverSocket.emit("game:done", gameState.game.rrN, gameState.game.id, gameState.myColor, gameState.myScore);
            return;
        }
    } else if (move.length == 6) {
        gameState.inputTileColors = move;
    }
    gameState.program.stdin.write(move + "\n");
});

serverSocket.on("game:done", (oppColor, oppScore) => {
    vlog("game:done - myColor", gameState.myColor, "myScore", gameState.myScore, "oppColor", oppColor, "oppScore", oppScore);
    const game = gameState.game;
    if (!game) {
        cerror("game:done - no current game");
        return;
    }
    const myScore = gameState.myScore;
    let result;
    let ms = myScore;
    let os = oppScore;
    const diff = Math.abs(myScore - oppScore);
    if (myScore == oppScore) {
        result = "DRAW";
        ms = os = 150;
    } else {
        if (myScore > oppScore) {
            result = "WIN";
            ms = 200 + diff;
            os = 100 - diff;
        } else {
            result = "LOSS";
            ms = 100 - diff;
            os = 200 + diff;
        }
    }
    let score = (game.p == 1) ? ms + " - " + os : os + " - " + ms;
    if (!params.noFiles) {
        gameWriteHTML(score, oppColor, oppScore);
    }
    vlog("RESULT:", result, "as P" + game.p, "score", score, "vs", game.opponent);
    state.nCompletedGames++;
    vlog(state.nCompletedGames, "total games completed");
    if (!params.noUI) {
        if (state.completedGames.length >= params.maxGamesInUI) {
            state.completedGames.shift();
        }
        state.completedGames.push({rrN: game.rrN, round: game.round, opponent: game.opponent, p: game.p, score: score, result: result, sessionFolderName: state.sessionFolderName});
        uiEmitCompletedGames();
    }
    beginNewGame();
});

serverSocket.on("round:timeout", (rrN, round) => {
    if (!state.inSession) {
        return;
    }
    vlog("RR", rrN, "round", round, "timedout");
    if (gameState.game && gameState.game.rrN == rrN && gameState.game.round == round) {
        vlog("gameId", gameState.game.id, "timeout");
        if (state.upcomingGames.length > 0) {
            const nextGame = state.upcomingGames[0];
            if (nextGame.rrN == rrN && nextGame.round == round) {
                vlog("Skipping next gameId", nextGame.id, "in round", round, "due to round timeout");
                state.upcomingGames.shift();
            }
        }
        beginNewGame();
    }
});

/* UI */

async function removeRecursively(directory) {
    await fs.promises.rm(directory, { recursive: true, force: true });
}

function clearAllGames(callback) {
    const folderPath = join(import.meta.dirname, "all-games", params.programBasename);
    removeRecursively(folderPath).then(() => {
        fs.mkdirSync(folderPath, { recursive: true });
        state.completedGames = [];
        state.nCompletedGames = 0;
        uiEmitCompletedGames();
        callback({ status: "ok" });
    })
}

function uiEmitParams() {
    ui.emit("params", params);
}

function uiEmitServerConnected() {
    ui.emit("server:connected", state.serverConnected);
}

function uiEmitServerStatus() {
    ui.emit("server:status", state.serverStatus);
}

function uiEmitSessionStatus() {
    const status = {
        inSession: state.inSession,
        playerName: state.playerName,
        scheduledMatches: state.scheduledMatches
    };
    ui.emit("session:status", status);
}

function uiEmitGameStatus() {
    ui.emit("game:status", gameState.game);
}

function uiEmitPlayersOnline() {
    ui.emit("players:online", state.players);
}

function uiEmitLeaderboard() {
    ui.emit("leaderboard", state.leaderboard);
}

function uiEmitCompletedGames() {
    let stats = {t: 0, w: 0, l: 0, d: 0, wp: 0, w1p: 0, w2p: 0, lp: 0, dp: 0};
    for (let i = 0; i < state.completedGames.length; i++) {
        let game = state.completedGames[i];
        stats.t++;
        if (game.result == "WIN") {
            stats.w++;
            stats.wp++;
            (game.p == 1) ? stats.w1p++ : stats.w2p++;
        } else if (game.result == "LOSS") {
            stats.l++;
            stats.lp++;
        } else {
            stats.d++;
            stats.dp++;
        }
    }
    stats.wp = (stats.wp / stats.t * 100).toFixed(1);
    stats.w1p = (stats.w1p / stats.w * 100).toFixed(1);
    stats.w2p = (stats.w2p / stats.w * 100).toFixed(1);
    stats.lp = (stats.lp / stats.t * 100).toFixed(1);
    stats.dp = (stats.dp / stats.t * 100).toFixed(1);
    stats.wp = isNaN(stats.wp) ? 0 : stats.wp;
    stats.w1p = isNaN(stats.w1p) ? 0 : stats.w1p;
    stats.w2p = isNaN(stats.w2p) ? 0 : stats.w2p;
    stats.lp = isNaN(stats.lp) ? 0 : stats.lp;
    stats.dp = isNaN(stats.dp) ? 0 : stats.dp;
    ui.emit("completed:games", state.nCompletedGames, state.completedGames, stats, params.programBasename);
}

ui.on("connection", (socket) => {
    vlog("UI connected");
    uiEmitParams();
    uiEmitSessionStatus();
    uiEmitServerConnected();
    uiEmitGameStatus();
    uiEmitPlayersOnline();
    uiEmitLeaderboard();
    uiEmitCompletedGames();
    uiEmitServerStatus();
    socket.on("disconnect", (reason) => {
        vlog("UI disconnected");
    });
    socket.on("session:start", (player, ack) => {
        state.playerName = player;
        startSession(ack);
        state.autoStart = params.autoStart;
    });
    socket.on("session:stop", (ack) => {
        stopSession(ack);
        state.autoStart = false;
    });
    socket.on("clear:games", (ack) => {
        clearAllGames(ack);
        vlog("All games cleared");
    });
});
