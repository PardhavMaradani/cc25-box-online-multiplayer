const socket = io({ path: new URL("socket.io", location).pathname });

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

socket.on("leaderboard", (leaderboard) => {
    const now = Date.now();
    Object.entries(leaderboard).forEach(([player, details]) => {
        details.name = player;
        details.lastSeen = Math.floor(Math.abs(now - details.lastSeen) / 86400000);
        if (details.rating == undefined || details.nGames < 100) {
            details.rating = -4000;
        }
    });
    const sortedLeaderboard = Object.values(leaderboard).sort((a,b) => b.rating - a.rating);
    const leaderboardList = document.createElement("tbody");
    let i = 1;
    sortedLeaderboard.forEach((item) => {
        if (item.nGames < 1) {
            return;
        }
        const row = leaderboardList.insertRow();
        row.insertCell().innerText = i++;
        row.insertCell().innerHTML = item.name + "<div><small class='fw-light'>" + item.lastSeen + "d ago, " + item.nGames + " games</small></div>";
        row.insertCell().innerText = item.rating == -4000 ? "-" : item.rating;
    });
    document.getElementById("nLBPlayers").innerText = i - 1;
    document.getElementById("leaderboardList").innerHTML = leaderboardList.innerHTML;
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
