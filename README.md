# CodeCup 2025 Box Online Multiplayer

Sources for an unofficial online multiplayer version of [CodeCup 2025](https://www.codecup.nl/intro.php) contest game [Box](https://www.codecup.nl/rules.php).

The purpose of this is to allow contestants to have their programs play against one another **online** while they build and improve their programs for the test and final competitions of CodeCup 2025.  Contestants don't have to share their source code or the program binaries - their program runs locally on their own systems and **only** the game moves are transmitted over to the other players - everything else like the completed game HTML's and logs generated are all local to the contestant.

The Box Online Multiplayer version has two components.  A **server** component that is hosted on a publicly accessible server and a **client** component that contestants run locally on their systems which invokes their program to play the Box games.  This repo has sources for both the components, but contestants only need the **client** component to participate.

- [Getting Started](#getting-started)
- [Game Results and Logs](#game-results-and-logs)
- [Command Line Interface](#command-line-interface-cli)
- [Hosted Server](#hosted-server)
- [Client Component](#client-component)
- [Server Component](#server-component)

## Getting Started

The **client** component is a [Node.js](https://nodejs.org/) application and hence requires Node.js [installed](https://nodejs.org/en/download/package-manager) on your system.

Here are the instructions to get started:

```
git clone https://github.com/PardhavMaradani/cc25-box-online-multiplayer.git
cd cc25-box-online-multiplayer/client
npm install
npm start -- -s https://box.servegame.com -p <your_executable_box_program>
```

After these commands are run in a terminal window, you should see something similar to:

![Client install and start](images/client-install-and-start.png)

Browse to [http://localhost:3000](http://localhost:3000) as mentioned in the console output in a browser to access the UI.  You should see something similar to:

![Start UI](images/start-ui.png)

Click on the `Start Session` button in the UI and that's it.  You will be scheduled in the next round-robin and games will be played against all other online players at that time.  The games will continue to get played in all future round-robin's till you explicitly click on `Stop Session` or your **client** disconnects for whatever reason.

You should see somthing like this in the browser while the games are in progress:

![Games running](images/games-running.png)

## Game Results and Logs

You can click on the **Result** link in the games under the `Completed Games` section to see a familiar `caia` generated game HTML output as follows:

![Sample game result](images/sample-game-result.png)

Your program logs that are typically written to stderr as per the [technical rules](https://www.codecup.nl/rules_tech.php) can be seen towards the end of the same HTML file.

All games are organised session wise (between a `Start Session` and an `End Session`) and they can be accessed from the `All Games` link at the bottom of the UI:

![All games link](images/all-games-link.png)

The `All Games` UI looks something like this, where you can browse per session and filter as needed as shown below:

![All games UI](images/all-games-ui.png)

## Command Line Interface (CLI)

If you only need the command line interface, you can start the **client** with a `-v` and `-a` options as seen below.  For a full list of all available **client** options, check out the [Client](client/README.md) page.

```
npm start -- -s https://box.servegame.com -p <your_executable_box_program> -v -a
```

The `-v` option is to write verbose logs and the `-a` option is to auto start a session.

Here is a sample output:

![CLI run](images/cli-run.png)

All the game HTML files will be generated as before and can be found in the `all-games` folder.  You can turn off generating the HTML files, don't listen on the UI port and change several other configurable options as detailed in the [Client](client/README.md) page.

## Hosted Server

The Box Online Multiplayer **server** is hosted on a `e2-micro` VM instance in the `us-west1` region of [Google Cloud Platform](https://cloud.google.com/) (GCP) as this falls under the free-tier.  The server is accessible via a free [No-IP](https://www.noip.com) hostname as [https://box.servegame.com](https://box.servegame.com).  This is what the **clients** connect to by specifying the `-s https://box.servegame.com` option.  The [https://box.servegame.com](https://box.servegame.com) URL also show the current status of the server.

The source for the **server** component and all other details to host your own local / hosted server if required are available in the [Server](server/README.md) and [Docker](docker/README.md) pages.

## Client Component

All the details about the **client** component can be found in the [Client](client/README.md) page.

## Server Component

All the details about the **server** component can be found in the [Server](server/README.md) page.

