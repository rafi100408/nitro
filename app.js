const
	chalk = require('chalk'),
	logger = require('./utils/logger'),
	ms = require('ms'),
	needle = require('needle'),
	{ redeemNitro } = require('./utils/functions'),
	{ existsSync, readFileSync, watchFile, writeFileSync } = require('fs'),
	ProxyAgent = require('simple-proxy-agent');

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

const stats = { threads: 0, attempts: 0, startTime: 0, working: 0 };
process.on('uncaughtException', (e) => { console.error(e); stats.threads--; });
process.on('unhandledRejection', (e) => { console.error(e); stats.threads--; });

(async () => {
	let proxies = [...new Set(unfiltered.concat(oldWorking))];
	if (config.scrapeProxies) proxies = [...new Set(proxies.concat(await require('./utils/proxy-scrapper')()))];

	proxies = await require('./utils/proxy-checker')(proxies, config.threads);
	logger.info(`Loaded ${chalk.yellow(proxies.length)} proxies.`);

	const generateCode = () => {
		const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let code = '';
		for (let i = 0; i < 16; i++) { code += chars.charAt(Math.floor(Math.random() * chars.length)); }
		return code;
	};

	const checkCode = async (code, proxy, retries = 0) => {
		logStats();
		if (!proxy) { stats.threads--; return; }

		const url = `https://discord.com/api/v6/entitlements/gift-codes/${code}?with_application=false&with_subscription_plan=true`;
		const res = await needle('get', url, {
			agent: new ProxyAgent('http://' + proxy, { tunnel: true, timeout: 5000 }),
			follow: 10,
			response_timeout: 10000,
			read_timeout: 5000,
		}).catch(e => e);

		const body = res?.body;
		if (!body?.message && !body?.subscription_plan) {
			if (retries < 500) {
				retries++;
				logger.debug(`Connection to ${chalk.grey(proxy)} failed : ${chalk.red(res.code || 'INVALID RESPONSE')}.`);
				setTimeout(() => { checkCode(generateCode(), proxy, retries); }, 1000);
			}
			else {
				// proxies.push(proxy); // don't remove proxy
				logger.debug(`Removed ${chalk.gray(proxy)} : ${chalk.red(res.code || 'INVALID RESPONSE')}`);
				checkCode(generateCode(), proxies.shift());
			}
			return;
		}

		retries = 0; stats.attempts++;
		if (!working_proxies.includes(proxy)) working_proxies.push(proxy);

		if (body.subscription_plan) {
			logger.info(`Found a valid gift code : https://discord.gift/${code} !`);

			// Try to redeem the code if possible
			redeemNitro(code, config);

			if (config.webhookUrl) { sendWebhook(config.webhookUrl, `(${res.statusCode}) Found a \`${body.subscription_plan.name}\` gift code in \`${ms(+new Date() - stats.startTime, { long: true })}\` : https://discord.gift/${code}.`); }

			// Write working code to file
			let codes = readFileSync('./validCodes.txt', 'UTF-8');
			codes += body?.subscription_plan || '???';
			codes += ` - https://discord.gift/${code}\n=====================================================n`;
			writeFileSync('./validCodes.txt', codes);

			stats.working++;
		}
		else if (body.message === 'You are being rate limited.') {
			// timeouts equal to 600000 are frozen. Most likely a ban from Discord's side.
			const timeout = body.retry_after;
			if (timeout != 600000) {
				proxies.push(proxy);
				logger.warn(`${chalk.gray(proxy)} is being rate limited (${(timeout / 1000).toFixed(2)}s), skipping proxy / waiting...`);
			}
			else {
				logger.debug(`${chalk.gray(proxy)} was most likely banned by Discord. Removing proxy...`);
			}

			const p = proxies.shift();
			return setTimeout(() => { checkCode(generateCode(), p); }, p === proxy ? body.retry_after : 0);
		}
		else if (body.message === 'Unknown Gift Code') {
			logger.warn(`${code} was an invalid gift code.`);
			return setTimeout(() => { checkCode(generateCode(), proxy); }, 1000);
		}
	};

	const logStats = () => {
		// Update title and write stats to stdout
		const aps = stats.attempts / ((+new Date() - stats.startTime) / 1000) || 0;
		process.title = `YANG - by Tenclea | Proxies : ${proxies.length + stats.threads} | Attempts : ${stats.attempts} (~${aps.toFixed(3)}/s) | Working Codes : ${stats.working}`;
		process.stdout.write(`Proxies : ${chalk.yellow(proxies.length + stats.threads)} | Attempts : ${chalk.yellow(stats.attempts)} (~${chalk.gray(aps.toFixed(3))}/s) | Working Codes : ${chalk.green(stats.working)}								\r`);
		return;
	};

	const threads = config.threads > proxies.length ? proxies.length : config.threads;
	logger.info(`Checking for codes using ${chalk.yellow(threads)} threads.`);

	const working_proxies = [];
	stats.startTime = +new Date();
	sendWebhook(config.webhookUrl, 'Started **YANG**.');

	const startThreads = () => {
		for (let i = 0; i < threads; i++) {
			checkCode(generateCode(), proxies.shift());
			stats.threads++;
			continue;
		}

		logger.debug(`Successfully started ${chalk.yellow(threads.length)} threads.`);
	};

	startThreads();

	setInterval(() => {
		// Close / restart program if all proxies used
		if (threads === 0) {
			logger.info('Restarting using working_proxies.txt list.');
			proxies = (readFileSync('./working_proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '');
			if (!proxies[0]) {
				logger.error('Ran out of proxies.');
				if (config.webhookUrl) return sendWebhook(config.webhookUrl, 'Ran out of proxies.').then(setTimeout(() => { process.exit(); }, 2500));
				else return process.exit();
			}
			config.saveWorkingProxies = false;
			return startThreads();
		}

		/* Save working proxies */
		if (config.saveWorkingProxies) { writeFileSync('./working_proxies.txt', working_proxies.join('\n')); }
	}, 5000);
})();