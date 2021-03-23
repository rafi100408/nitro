const
	ms = require('ms'),
	chalk = require('chalk'),
	needle = require('needle'),
	logger = require('./utils/logger'),
	{ getRandom } = require('random-useragent'),
	{ formatThreadID, redeemNitro } = require('./utils/functions'),
	{ existsSync, readFileSync, watchFile, writeFileSync } = require('fs');

// process.title = 'YANG - by Tenclea';
console.clear();
console.log(chalk.magenta(`
__  _____________   __________
_ \\/ /__    |__  | / /_  ____/
__  /__/ /| |_   |/ /_  / __  
_/ / _/ ___ |/ /|  / / /_/ /  
/_/  /_/  |_/_/ |_/  \\____/   
              ${chalk.italic(chalk.gray('- by Tenclea'))}
`));

const { checkConfig, sendWebhook } = require('./utils/functions');

let config = require('./config.json');
checkConfig(config);
watchFile('./config.json', () => {
	config = JSON.parse(readFileSync('./config.json'));

	// Updates logger
	logger.level = config.debugMode ? 'debug' : 'info';

	logger.info('Updated the config variables.');
	return checkConfig(config);
});

/* Load proxies, working proxies and removes duplicates */
const unfiltered = existsSync('./proxies.txt') ? (readFileSync('./proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '') : [];
const oldWorking = existsSync('./working_proxies.txt') ? (readFileSync('./working_proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '') : [];
if (!oldWorking[0] && !unfiltered[0]) { logger.error('Please make sure to add some proxies in "proxies.txt".'); process.exit(); }

(async () => {
	let proxies = [...new Set(unfiltered.concat(oldWorking))];
	if (config.scrapeProxies) proxies = [...new Set(proxies.concat(await require('./utils/proxy-scrapper')()))];
	if (config.checkProxies) proxies = await require('./utils/proxy-checker')(proxies, config.threads, config.proxyRetries);
	logger.info(`Loaded ${chalk.yellow(proxies.length)} proxies.`);

	const generateCode = () => {
		const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let code = '';
		for (let i = 0; i < 16; i++) { code += chars.charAt(Math.floor(Math.random() * chars.length)); }
		return code;
	};

	const checkCode = (code, t) => {
		// Current attempts per second formula.
		const aps = stats.attList.length > 0 ? ((stats.attList.reduce((a, b) => a + b) + stats.att) / (stats.attList.length * 5 + ((+new Date() - lastInterval) / 1000))).toFixed(3) : '0.000';

		// Update title and write stats to stdout
		process.title = `YANG - by Tenclea | Proxies : ${proxies.length + threads.filter(tr => tr != null).length} | Attempts : ${stats.att + stats.attTotal} (~${aps}/s) | Working Codes : ${stats.working}`;
		process.stdout.write(`Proxies : ${chalk.yellow(proxies.length + threads.filter(tr => tr != null).length)} | Attempts : ${chalk.yellow(stats.att + stats.attTotal)} (~${chalk.gray(aps)}/s) | Working Codes : ${chalk.green(stats.working)}								\r`);

		const proxy = threads[t];
		if (!proxy && proxies.length == 0) {
			logger.debug(`Shut down thread ${chalk.yellow(t)} : No more proxies available.`);
			threads[t] = null;
			return;
		}

		if (!retries[proxy] || isNaN(retries[proxy])) retries[proxy] = 0;
		const fThread = formatThreadID(config.threads, t);
		const url = `https://discord.com/api/v6/entitlements/gift-codes/${code}?with_application=false&with_subscription_plan=true`;
		needle.get(url, { proxy: proxy, user_agent: getRandom(), follow: 2, response_timeout: config.requestTimeout, read_timeout: config.requestTimeout }, (err, res, body) => {
			if (err || (res && [301, 302, 500, 501, 503, 504].includes(res.statusCode)) || !body || (!body.message && !body.subscription_plan)) {

				const errMsg = err ? (err.code || err.status) : body.message;
				if ((retries[proxy] >= config.proxyRetries || retries[proxy] < 0) && config.removeNonWorkingProxies) {
					// Remove proxy
					if (retries[proxy] > 0 && config.removeNonWorkingProxies) {
						logger.debug(`(${chalk.yellow(fThread)}) Removed ${chalk.gray(proxy)} : ${chalk.red(errMsg)}`);
					}
					else {
						proxies.push(proxy);
						logger.debug(`(${chalk.yellow(fThread)}) Skipped ${chalk.gray(proxy)} : ${chalk.red(errMsg)}.`);
					}

					delete retries[proxy];
					threads[t] = proxies.shift();
				}
				else {
					retries[proxy]++;
					logger.debug(`(${chalk.yellow(fThread)}) Connection to ${chalk.grey(proxy)} failed : ${chalk.red(errMsg)}. Retrying...`);
				}
				return setTimeout(() => { checkCode(generateCode(), t); }, 1000);
			}

			try {
				// Mark proxy as working
				retries[proxy] = -1;

				if (body.message === 'You are being rate limited.') {
					// Turned out that timeouts equal to 600000 are frozen. Most likely a ban from Discord's side.
					const timeout = body.retry_after;
					if (timeout != 600000) logger.debug(`(${chalk.yellow(fThread)}) ${chalk.gray(proxy)} is being rate limited (${(timeout / 1000).toFixed(2)}s). Skipping to next proxy...`);
					else logger.debug(`(${chalk.yellow(fThread)}) ${chalk.gray(proxy)} was most likely banned by Discord. Removing...`);

					delete retries[proxy];
					// If proxy banned, do not try again
					if (timeout != 600000) proxies.push(proxy);
					threads[t] = proxies.shift();

					return checkCode(generateCode(), t);
				}

				stats.att++;
				if (!working_proxies.includes(proxy)) working_proxies.push(proxy);

				if (body.message === 'Unknown Gift Code') {
					logger.warn(`(${chalk.yellow(fThread)}) ${code} was an invalid gift code.`);
					return setTimeout(() => { checkCode(generateCode(), t); }, 1500);
				}

				stats.working++;
				logger.info(`(${chalk.yellow(fThread)}) Found a valid gift code : https://discord.gift/${code} !`);

				// Try to redeem the code if possible
				redeemNitro(code, config);

				if (config.webhookUrl) {
					sendWebhook(config.webhookUrl, `(${res.statusCode}) Found a gift code in around ${ms(+new Date() - stats.startTime, { long: true })} : https://discord.gift/${code}. \n\`${body.subscription_plan.name}\``);
				}

				// Write working code to file
				let codes = readFileSync('./validCodes.txt', 'UTF-8');

				codes += body.subscription_plan ? body.subscription_plan.name : '?';
				codes += ` - https://discord.gift/${code}\n=====================================\n`;
				writeFileSync('./validCodes.txt', codes);

				return checkCode(generateCode(), t);
			}
			catch (e) {
				console.error('An unexpected error occurred :', e);

				delete retries[proxy];
				threads[t] = proxies.shift();

				return checkCode(generateCode(), t);
			}
		});
	};

	logger.info(`Checking for codes using ${chalk.yellow(config.threads)} threads.`);
	const stats = { threads: 0, att: 0, attList: [], attTotal: 0, startTime: null, working: 0 };
	stats.startTime = +new Date();
	const working_proxies = [];

	sendWebhook(config.webhookUrl, 'Started **YANG**.');

	let threads = [];
	let retries = {};
	const startThreads = () => {
		let notEnoughProxies = false;
		for (let i = 0; i < config.threads; i++) {
			const p = proxies.shift();
			if (!p) { notEnoughProxies = true; continue; }

			threads[i] = p;
			checkCode(generateCode(), i);
			continue;
		}

		if (notEnoughProxies) logger.warn(`Could only start ${chalk.yellow(threads.length)} out of ${config.threads} threads : not enough proxies were provided.`);
		else logger.debug(`Successfully started ${chalk.yellow(threads.length)} threads.`);
	};

	let lastInterval = +new Date();
	setTimeout(() => {
		startThreads();

		setInterval(() => {

			/* Threads checks */
			// Close / restart program if all proxies used
			if (threads.filter(t => t).length == 0) {
				if (config.restartWithWorkingProxies) {
					try {
						logger.info('Restarting using working_proxies.txt list.');

						proxies = (readFileSync('./working_proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '');
						threads = []; retries = {};
						config.saveWorkingProxies = false;
						config.removeNonWorkingProxies = false;

						return startThreads();
					}
					catch (e) {
						logger.error('Could not restart the generator : ' + e);
					}
				}
				else {
					logger.error('Ran out of proxies.');
					if (config.webhookUrl) return sendWebhook(config.webhookUrl, 'Ran out of proxies.').then(setTimeout(() => { process.exit(); }, 2500));
					else return process.exit();
				}
			}

			/* Stats attempts per second */
			stats.attList.push(stats.att);
			if (stats.attList.length > 50) stats.attList.shift();
			stats.attTotal += stats.att;
			stats.att = 0;

			/* Save working proxies */
			if (config.saveWorkingProxies) { writeFileSync('./working_proxies.txt', working_proxies.join('\n')); }

			lastInterval = +new Date();
		}, 5000);
	}, 5000);
})();