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

socket.on("players:online", (players) => {
    const sortedPlayers = Object.entries(players).sort((a,b) => b[1]-a[1]);
    const nP = sortedPlayers.length;
    const nPlayers = document.getElementById("nPlayers");
    nPlayers.innerText = nP;
    if (nP > 0) {
        nPlayers.classList.remove("text-bg-secondary");
        nPlayers.classList.add("text-bg-success");
    } else {
        nPlayers.classList.remove("text-bg-success");
        nPlayers.classList.add("text-bg-secondary");
    }
    const playersList = document.createElement("tbody");
    let i = 1;
    sortedPlayers.forEach((item) => {
        const row = playersList.insertRow();
        row.insertCell().innerText = i++;
        row.insertCell().innerText = item[0];
        row.insertCell().innerText = item[1] == -4000 ? "-" : item[1];
    });
    document.getElementById("playersList").innerHTML = playersList.innerHTML;
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
