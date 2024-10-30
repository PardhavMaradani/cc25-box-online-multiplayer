# CodeCup 2025 Box Online Multiplayer - Client

All the source code for the **client** component resides in this folder.

Here are all the command line options available to run the client:

```
Usage: npm start -- -s <server_url> -p <program> [-n <player_name>] [-e <passphrase>] [-t <server_timeout>] [-u <ui_port>] [-x] [-f] [-a] [-v] [-h]
Options:
  Required:
    -s|--serverURL     : server URL (required)
    -p|--program       : program to run (required)
  Optional:
    -n|--playerName    : player name (default: program name)
    -e|--passphrase    : register player name for exclusive use (default: none)
    -t|--serverTimeout : timeout in seconds for server socket (default: 5 seconds)
    -u|--uiPort        : port number to listen for UI (default: 3000)
    -m|--maxGamesInUI  : max completed games to list in UI (default: 512)
    -x|--noUI          : do not listen on UI port (default: false)
    -f|--noFiles       : do not create HTML files for completed games (default: false)
    -a|--autoStart     : start a session automatically (default: false)
    -v|--verbose       : show verbose output (default: false)
    -d|--debug         : show debug output (default: false)
    -h|--help          : show usage
```

Most of the options should be self explanatory.  Here are some more details about them:

- The `-s|--serverURL` param must point to `https://box.servegame.com`
  - Except for local development needs, where it can point to a local [Server](../server/)
- The box program passed via the `-p|--program` option needs to be a single executable file
  - Programs written in some languages might need to be packaged within an executable script
- The `-n|--playerName` option allows you to specify a virtual player name (validation is done for duplicates at runtime)
- The `-e|--passphrase` option allows you to register your player name for exclusive use.  No other player will be able to use this name without the passphrase.  A `sha256` hash of this is sent over to the server and stored there and validated every time during session start.  **It is strongly recommended to use this option to prevent your player name takeover by others, which can impact the bot rating**
- The `-u|--uiPort` option allows you to specify a custom port for the local client UI
- The `-m|--maxGamesInUI` option allows you to specify the maximum number of games that get listed in the UI.  Note that all games are still available via the `All games` link in the UI
- The `-x|--noUI` option disables listening on the UI port.  This could be useful if you cannot listen on a port or don't need the UI controls
- The `-f|--noFiles` option disables writing the game HTML files.  This could be useful if you want a program to participate, but don't want to write out all the game HTML files to disk
- The `-a|--autoStart` option will auto start a session.  This is required if you don't enable UI to start / stop a session manually
- The `-v|--verbose` option displays logs to the console.  Without this, only the errors get written to the console
- The `-d|--debug` option displays slightly more detailed logs (like schedule/game JSON)

The three `caia` players - `caia-player1`, `caia-player2` and `caia-player3` are launched with the `-x`, `-f` and `-a` options as can be seen in their [startup script](../docker/client/start-caia-players.sh).  With these options, they don't have a UI, they don't write to the file system and they auto start their sessions upon launch and are always available.

