<h1 align="center">YANG: Yet Another Nitro Generator</h1>

<p align="center">
  <a href="https://github.com/Tenclea/YANG/"><img src="https://img.shields.io/github/last-commit/tenclea/yang?style=flat" /></a>
  <a href="https://github.com/Tenclea/YANG/stargazers"><img src="https://img.shields.io/github/stars/Tenclea/YANG?style=flat" /></a>
  <br>
  <b>The most efficient nitro generator and checker you'll ever find.</b><br>
  Made with ❤ by <b>Tenclea</b>
  <br>
  If you liked this project, please consider <b>starring</b> it <3
</p>

<h2 align="center">Previews</h2>

<p align="center">
   • Proxy Scrapper & Checker : <br>
   <img src="https://i.imgur.com/PQElB3e.png" title="YANG - By Tenclea : Proxy Scrapper & Checker"/>
   <br><br>
   • Main Nitro Codes Generator : <br>
   <img src="https://i.imgur.com/4QlDMU9.png" title="YANG - By Tenclea : Main Nitro Codes Generator"/>
</p>

## Main features

* **Very fast code generator and checker (2000 attempts/minute)**
* Proxy scrapper and checker
* Auto nitro-redeem
* Download fresh proxies while checking codes
* Full webhook support
* Real-time stats

## Requirements

* [Node.js](https://nodejs.org/en/)
* [A Discord token](https://github.com/Tyrrrz/DiscordChatExporter/wiki/Obtaining-Token-and-Channel-IDs#how-to-get-a-user-token)

## Setup

* Clone or download this repository to your computer.
* Copy your token in the `redeemToken` field in the `config.json` file (use notepad to open it), and edit the other config variables as you like.
* Paste fresh http(s)/socks proxies into `required/http-proxies.txt`/`required/socks-proxies.txt`.
* Open up a command prompt in the downloaded folder and type `npm install` to install the requirements.
* Start the generator by typing `node app.js`.
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
