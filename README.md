# YANG: Yet Another Nitro Generator

**The most efficient nitro generator and checker you'll ever find.**  
Made with ❤ by **Tenclea**.

If you liked this project, please consider starring it <3

## Main features

* Proxy scrapper and checker
* Code generator and checker 
* Full webhook support
* Auto nitro-redeem

With a list of fresh proxies, I often reach ~30 checks/second.

## Requirements

* [Node.js](https://nodejs.org/en/)
* [A Discord token](https://github.com/Tyrrrz/DiscordChatExporter/wiki/Obtaining-Token-and-Channel-IDs#how-to-get-a-user-token)

## Setup

* Clone or download this repository to your computer.
* Copy your token in the `redeemToken` field in the `config.json` file (use notepad to open it), and edit the other config variables as you like.
* Paste fresh http(s) proxies into `proxies.txt`.
* Open up a command prompt in it and type `npm install` to install the requirements.
* Start the generator by typing `node app.js` .
* If any error pops out, make sure to fix it before using the generator.

### Config file

These are the "global/config variables" :

* `debugMode` > Prints additional information to the console, like proxies connection errors. (true/false)
* `redeemToken` > The token the nitro codes will be applied to. (String)
* `saveWorkingProxies` > Whether to write or not the working proxies to `working_proxies.txt` (recommended). (true/false)
* `scrapeProxies` > Whether to automatically or not download fresh proxies from online sources. (true/false)
* `threads` > The number of attempts to run at the same time. (Number)
* `webhookUrl` > A webhook url to be notified when a code was found. (String)

## Disclaimer

Everything you can see here has been made for educational purposes and as a proof of concept.  
I do not promote the usage of my tools, and do not take responsibility for any bad usage of this tool.  
Stealing codes means stealing money from people and is against Discord's TOS. Don't.
