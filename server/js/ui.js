const socket = io();

function showError(message) {
    document.getElementById("connected").classList.add("collapse");
    document.getElementById("errorText").innerText = message;
    document.getElementById("error").classList.remove("collapse");
}

function hideError() {
    document.getElementById("error").classList.add("collapse");
    document.getElementById("connected").classList.remove("collapse");
}

socket.on("connect", () => {
    hideError();
});

socket.on("connect_error", (error) => {
    if (socket.active) {
        showError("Reconnecting to Server ...");
    } else {
        showError("Please reload the page and try again");
    }
});

socket.on("disconnect", (reason, details) => {
    showError("Disconnected from Server");
});

socket.on("players", (players) => {
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
    players.forEach((player) => {
        let playerElem = document.createElement("li");
        playerElem.classList.add("list-group-item");
        playerElem.classList.add("bg-light");
        playerElem.innerText = player;
        playersList.appendChild(playerElem);
    });
});

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

socket.on("status", (status) => {
    const statusList = document.getElementById("statusList");
    statusList.innerHTML = "";
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
