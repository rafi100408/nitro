# YANG
Yet Another Nitro Generator - by Tenclea

A project I made some time ago, now available to everyone.

## Requirements

* [Node.js](https://nodejs.org/en/)
* [A Discord token](https://github.com/Tyrrrz/DiscordChatExporter/wiki/Obtaining-Token-and-Channel-IDs#how-to-get-a-user-token)

## Setup

* Clone or download this repository to your computer.
* Copy your token in the `redeemToken` field in the `config.json` file (use notepad to open it), and edit the other config variables as you like.
* Open up a command prompt in it and type `npm install` to install the requirements.
* Start the generator by typing `node app.js` .
* If any error pops out, make sure to fix it before using the generator.

### Config file

These are the "global/config variables" :

* `debugMode` > Prints more informations to the console, like not working proxies. (true/false)
* `proxyRetries` > How many times to retry a non-working proxy. (Number)
* `removeNonWorkingProxies` > Whether to remove or not proxies that have been retried `proxyRetries` times. (true/false)
* `redeemToken` > The token the nitro codes will be applied to. (String)
* `requestTimeout` > How long to wait for a proxy request (in ms). (Number)
* `restartWithWorkingProxies` > Whether to restart or not with all working proxies after using all proxies (recommended). (true/false)
* `saveWorkingProxies` > Whether to write or not the working proxies to `workingProxies.txt` (recommended). (true/false)
* `threads` > The number of attemps to run at the same time. (Number)
* `threadTimeout` > Time to wait before restarting a stuck thread (in ms) (must be higher than `requestTimeout`). (Number)
* `webhookUrl` > A webhook url to be notified when a code was found. (String)

## Disclaimer

Everything you can see here has been made for educational purposes and as a proof of concept.  
I do not promote the usage of my tools, and do not take responsibility for any bad usage of this tool.
Stealing codes means stealing money from people. Don't.
