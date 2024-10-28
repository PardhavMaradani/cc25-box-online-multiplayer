let pSMRow = 0;
let players = [];
let noFiles = false;
let programBasename = null;
const socketTimeout = 3000;
let completedGamesFilter = "";

function toggleSessionButtonInteraction(enabled) {
    document.getElementById("session").disabled = !enabled;
    const inSession = document.getElementById("session").classList.contains("btn-danger");
    document.getElementById("playerName").disabled = inSession || !enabled;
}

function toggleLinkInteraction(enabled) {
    document.querySelectorAll("a").forEach((elem) => {
        elem.classList.toggle("disabled", !enabled);
    });
    const inSession = document.getElementById("session").classList.contains("btn-danger");
    document.getElementById("clearAllGames").classList.toggle("disabled", inSession || !enabled);
}

function togglePageInteraction(enabled) {
    toggleLinkInteraction(enabled);
    toggleSessionButtonInteraction(enabled);
}

function setSessionButtonText(inSession) {
    let sessionButton = document.getElementById("session");
    if (inSession) {
        sessionButton.classList.remove("btn-success");
        sessionButton.classList.add("btn-danger");
        sessionButton.innerText = "Stop Session";
    } else {
        sessionButton.classList.remove("btn-danger");
        sessionButton.classList.add("btn-success");
        sessionButton.innerText = "Start Session";
    }
    document.getElementById("clearAllGames").classList.toggle("disabled", inSession);
    document.getElementById("playerName").disabled = inSession;
}

function setScheduledMatchesInfo(info) {
    document.getElementById("scheduledMatchesInfo").innerText = info;
}

function setNScheduledMatches(n, rr) {
    const nScheduled = document.getElementById("nScheduled");
    nScheduled.innerText = n;
    if (n > 0) {
        setScheduledMatchesInfo(n + " match" + (n > 1 ? "es" : "") + " in round-robin " + rr + " (" + (n + 1) + " players)");
        nScheduled.classList.remove("text-bg-secondary");
        nScheduled.classList.add("text-bg-success");
    } else {
        setScheduledMatchesInfo("Waiting for next round-robin ...");
        nScheduled.classList.remove("text-bg-success");
        nScheduled.classList.add("text-bg-secondary");
    }
}

function setScheduledMatches(inSession, playerName, schedule) {
    pSMRow = 0;
    setNScheduledMatches(0, 0);
    document.getElementById("scheduledMatches").innerHTML = "";
    if (!inSession) {
        setScheduledMatchesInfo("No scheduled matches");
    } else {
        if (schedule.length == 0) {
            setScheduledMatchesInfo("Waiting for next round-robin ...");
        } else {
            const scheduledMatches = document.createElement("tbody");
            for (let m = 0; m < schedule.length; m++) {
                const row = scheduledMatches.insertRow();
                row.insertCell().innerText = schedule[m].rrN;
                row.insertCell().innerText = schedule[m].round + 1;
                row.insertCell().innerText = schedule[m].opponent;
            }
            document.getElementById("scheduledMatches").innerHTML = scheduledMatches.innerHTML;
            setNScheduledMatches(schedule.length, schedule[0].rrN);
        }
    }
}

function startSession() {
    toggleSessionButtonInteraction(false);
    socket.timeout(socketTimeout).emit("session:start", document.getElementById("playerName").value, (error, response) => {
        if (error) {
            showError("Start Session: " + error.message, true);
        } else {
            if (response.status == 'ok') {
                setSessionButtonText(true);
            } else if (response.status == 'error') {
                showError("Start Session: " + response.message, true);
            }
        }
        toggleSessionButtonInteraction(true);
    });
}

function stopSession() {
    toggleSessionButtonInteraction(false);
    socket.timeout(socketTimeout).emit("session:stop", (error, response) => {
        if (error) {
            showError("Stop Session: " + error.message, true);
        } else {
            if (response.status == 'ok') {
                setSessionButtonText(false);
            } else if (response.status == 'error') {
                showError("Stop Session: " + response.message, true);
            }
        }
        toggleSessionButtonInteraction(true);
    });
}

function duplicatePlayerName(playerName) {
    return players.includes(playerName);
}

function clearAllGames() {
    socket.timeout(socketTimeout).emit("clear:games", (error, response) => {
        if (error) {
            showError("Clear All Games: " + error.message, true);
        }
    });
}

function clearCompletedGamesFilter() {
    completedGamesFilter = document.getElementById("completedGamesFilter").value = "";
    document.getElementById("completedGamesFilterClose").classList.add("collapse");
    const clonedNode = document.getElementById("completedGames").cloneNode(true);
    clonedNode.querySelectorAll("tr").forEach((row) => {
        row.classList.remove("collapse");
    });
    document.getElementById("completedGames").replaceWith(clonedNode);
}

function applyCompletedGamesFilter() {
    document.getElementById("completedGamesFilterClose").classList.remove("collapse");
    const clonedNode = document.getElementById("completedGames").cloneNode(true);
    clonedNode.querySelectorAll("tr").forEach((row) => {
        row.classList.toggle("collapse", !row.innerText.toLowerCase().includes(completedGamesFilter));
    });
    document.getElementById("completedGames").replaceWith(clonedNode);
}

function setHandlers() {
    // session button
    document.getElementById("stopSession").addEventListener("click", (event) => {
        new bootstrap.Modal(document.getElementById("stopSessionModal")).hide();
        stopSession();
    });
    let sessionButton = document.getElementById("session");
    sessionButton.addEventListener("click", (event) => {
        event.preventDefault();
        let inSession = sessionButton.classList.contains("btn-danger");
        if (!inSession) {
            let form = document.querySelector(".needs-validation");
            let invalidFeedbackElem = document.querySelector(".invalid-feedback");
            let playerNameElem = document.getElementById("playerName");
            let playerName = playerNameElem.value;
            let invalid = true;
            let invalidFeedback = "";
            if (duplicatePlayerName(playerName)) {
                invalidFeedback = "Duplicate player name '" + playerName + "'";
            } else if (!form.checkValidity()) {
                invalidFeedback = "Please enter a valid player name (^[\w\-.]+$)";
            } else if (playerName == "_bye_") {
                invalidFeedback = "Reserved player name";
            } else {
                invalid = false;
            }
            form.classList.add("was-validated");
            if (invalid) {
                invalidFeedbackElem.innerText = invalidFeedback;
                document.getElementById("playerName").value = "";
                playerNameElem.focus();
            } else {
                // start session
                startSession();
            }
        } else {
            // stop session
            const nScheduled = document.getElementById("nScheduled").innerText;
            if (nScheduled > 0) {
                new bootstrap.Modal(document.getElementById("stopSessionModal")).show();
            } else {
                stopSession();
            }
        }
    });
    document.getElementById("stopSessionModal").addEventListener("shown.bs.modal", () => {
        document.getElementById("stopSession").focus();
    });
    // all games link
    document.getElementById("allGames").addEventListener("click", (event) => {
        event.preventDefault();
        window.open("all-games/" + programBasename, '_blank');
    });
    // clear all games link
    document.getElementById("clearAllGames").addEventListener("click", (event) => {
        event.preventDefault();
        new bootstrap.Modal(document.getElementById("clearAllGamesModal")).show();
    });
    document.getElementById("clearAllGamesModal").addEventListener("shown.bs.modal", () => {
        document.getElementById("clearAllGamesYes").focus();
    });
    document.getElementById("clearAllGamesYes").addEventListener("click", (event) => {
        new bootstrap.Modal(document.getElementById("clearAllGamesModal")).hide();
        clearAllGames();
    });
    // error close
    document.getElementById("errorClose").addEventListener("click", (event) => {
        document.getElementById("errorClose").classList.add("collapse");
        hideError();
    });
    // completed games filter
    document.getElementById("completedGamesFilter").addEventListener("keyup", (event) => {
        event.stopPropagation();
        const filter = event.target.value.trim().toLowerCase();
        if (event.key === "Escape" || filter.length == 0) {
            clearCompletedGamesFilter();
        } else {
            completedGamesFilter = event.target.value.trim().toLowerCase();
            applyCompletedGamesFilter();
        }
    });
    // completed games filter clear
    document.getElementById("completedGamesFilterClose").addEventListener("click", (event) => {
        clearCompletedGamesFilter();
    });
}

function showError(message, allowClose) {
    document.getElementById("connected").classList.add("collapse");
    document.getElementById("errorText").innerText = message;
    document.getElementById("error").classList.remove("collapse");
    if (allowClose) {
        document.getElementById("error").classList.add("alert-dismissible");
        document.getElementById("errorClose").classList.remove("collapse");
    } else {
        document.getElementById("error").classList.remove("alert-dismissible");
        document.getElementById("errorClose").classList.add("collapse");
    }
}

function hideError() {
    document.getElementById("error").classList.add("collapse");
    document.getElementById("connected").classList.remove("collapse");
    togglePageInteraction(true);
}

function addStatusRow(statusList, name, value) {
    const statusElem = document.createElement("li");
    statusElem.classList.add("list-group-item");
    statusElem.classList.add("bg-light");
    if (name != "") {
        statusElem.innerText = name + " : " + value;
    } else {
        statusElem.classList.add("text-danger");
        statusElem.innerText = value;
    }
    statusList.appendChild(statusElem);
}


setHandlers();
togglePageInteraction(false);

const socket = io({path: new URL('socket.io', location).pathname});

socket.on("connect", () => {
});

socket.on("connect_error", (error) => {
    if (socket.active) {
        showError("UI reconnecting to Local Client ...");
    } else {
        showError("Please reload the page and try again");
    }
    togglePageInteraction(false);
});

socket.on("disconnect", (reason, details) => {
  showError("UI disconnected from Local Client");
  togglePageInteraction(false);
});

socket.on("params", (params) => {
    programBasename = params.programBasename;
    noFiles = params.noFiles;
    if (noFiles) {
        document.getElementById("allGamesDiv").classList.add("collapse");
    } else {
        document.getElementById("allGamesDiv").classList.remove("collapse");
    }
});

socket.on("server:connected", (connected) => {
    if (connected) {
        hideError();
    } else {
        showError("Local Client disconnected from Remote Server");
        toggleSessionButtonInteraction(false);
        toggleLinkInteraction(true);
    }
});

socket.on("server:status", (status) => {
    const statusList = document.getElementById("statusList");
    statusList.innerHTML = "";
    if (status == null) {
        addStatusRow(statusList, "", "No round-robin in progress");
        return;
    }
    if (status.rrInProgress) {
        addStatusRow(statusList, "Round-Robin", status.rrN);
        addStatusRow(statusList, "  > Number of Players", status.nPlayers);
        addStatusRow(statusList, "  > Current Round", status.currentRound + 1 + " / " + status.nRounds);
        addStatusRow(statusList, "  > Number of Games Done", status.nDone + " / " + status.nGames);
        addStatusRow(statusList, "  > Start time", new Date(status.tsStart).toLocaleString());
        addStatusRow(statusList, "  > Max end time", new Date(status.tsEnd).toLocaleString());
    } else {
        addStatusRow(statusList, "", "No round-robin in progress (< " + status.mPlayers + " players)");
    }
    addStatusRow(statusList, "Total Games Done", status.tDone);
    addStatusRow(statusList, "Total Round-Robins Done", status.rrInProgress ? status.rrN - 1 : status.rrN - 1);
    addStatusRow(statusList, "Up Since", new Date(status.upSince).toLocaleString());
});

socket.on("session:status", (status) => {
    document.getElementById("playerName").value = status.playerName;
    document.querySelector(".needs-validation").classList.add("was-validated");
    setSessionButtonText(status.inSession);
    setScheduledMatches(status.inSession, status.playerName, status.scheduledMatches);
});

socket.on("game:status", (game) => {
    const currentMatch = document.createElement("tbody");
    document.getElementById("currentMatchInfo").innerText = "No current match";
    if (game) {
        const prefix = " Round [" + (game.round + 1) + "/" + game.tr + "] Game [" + game.g + "/2] - ";
        if (game.inProgress) {
            document.getElementById("currentMatchInfo").innerText = prefix + "In progress ...";
        } else {
            document.getElementById("currentMatchInfo").innerHTML = prefix + "Waiting for <b>" + game.opponent + "</b> ...";
        }
        const row = currentMatch.insertRow();
        row.insertCell().innerText = game.rrN;
        row.insertCell().innerText = game.round + 1;
        row.insertCell().innerText = game.opponent;
        row.insertCell().innerText = game.p;
        row.classList.add("table-info");
        const scheduledMatches = document.getElementById("scheduledMatches");
        if (scheduledMatches.rows.length > 0) {
            if (scheduledMatches.rows[pSMRow]) {
                scheduledMatches.rows[pSMRow].classList.remove("table-info");
            }
            scheduledMatches.rows[game.SMRow].classList.add("table-info");
            pSMRow = game.SMRow;
        }
    }
    document.getElementById("currentMatch").innerHTML = currentMatch.innerHTML;
});

socket.on("players", (players) => {
    players = players;
    const nPlayers = document.getElementById("nPlayers");
    nPlayers.innerText = players.length;
    if (players.length > 0) {
        nPlayers.classList.remove("text-bg-secondary");
        nPlayers.classList.add("text-bg-success");
    } else {
        nPlayers.classList.remove("text-bg-success");
        nPlayers.classList.add("text-bg-secondary");
    }
    const playersList = document.getElementById("playersList");
    playersList.classList.remove("list-group-numbered");
    playersList.innerHTML = "<li class='list-group-item text-center bg-light'>No players</li>";
    if (players.length > 0) {
        playersList.innerHTML = "";
        playersList.classList.add("list-group-numbered");
    }
    const playerName = document.getElementById("playerName").value;
    players.forEach((player) => {
        let playerElem = document.createElement("li");
        playerElem.classList.add("list-group-item");
        if (player == playerName) {
            playerElem.classList.add("list-group-item-info");
        } else {
            playerElem.classList.add("bg-light");
        }
        playerElem.innerText = player;
        playersList.appendChild(playerElem);
    });
});

socket.on("completed:games", (n, games, stats, programBasename) => {
    document.getElementById("nAggGames").innerText = games.length;
    const nCompleted = document.getElementById("nCompleted");
    nCompleted.innerText = n;
    if (n > 0) {
        nCompleted.classList.remove("text-bg-secondary");
        nCompleted.classList.add("text-bg-success");
        document.getElementById("completedGamesInfo").innerText = "Last " + games.length + " completed game" + (games.length > 1 ? "s" : "");
    } else {
        nCompleted.classList.remove("text-bg-success");
        nCompleted.classList.add("text-bg-secondary");
        document.getElementById("completedGamesInfo").innerText = "No completed games";
    }
    const completedGames = document.createElement("tbody");
    for (let i = 0; i < games.length; i++) {
        const game = games[games.length - 1 - i];
        const row = completedGames.insertRow();
        row.insertCell().innerText = game.rrN;
        row.insertCell().innerText = game.opponent;
        row.insertCell().innerText = game.p;
        row.insertCell().innerText = game.score;
        let r = "-d-"
        if (game.result == "WIN") {
            row.classList.add("table-success");
            r = "-w-";
        } else if (game.result == "LOSS") {
            row.classList.add("table-danger");
            r = "-l-";
        }
        const gameFile = "rr-" + game.rrN + "-r-" + (game.round + 1) + "-p-" + game.p + r + "o-" + game.opponent + ".html"
        if (noFiles) {
            row.insertCell().innerText = game.result;
        } else {
            row.insertCell().innerHTML = "<a class='btn btn-link p-0' href='all-games/" + programBasename + "/" + game.sessionFolderName + "/" + gameFile + "' target='_blank'>" + game.result + "</a>";
        }
        if (completedGamesFilter != "" && !row.innerText.toLowerCase().includes(completedGamesFilter)) {
            row.classList.add("collapse");
        }
    }
    document.getElementById("completedGames").innerHTML = completedGames.innerHTML;
    const aggStats = document.createElement("tbody");
    const row = aggStats.insertRow();
    Object.values(stats).forEach((stat) => {
        row.insertCell().innerText = stat;
    });
    document.getElementById("aggStats").innerHTML = aggStats.innerHTML;

});
