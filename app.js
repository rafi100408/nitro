const
	chalk = require('chalk'),
	logger = require('./utils/logger'),
	ms = require('ms'),
	needle = require('needle'),
	{ checkConfig, checkForUpdates, getCommunityCodes, redeemNitro, sendWebhook } = require('./utils/functions'),
	{ existsSync, readFileSync, watchFile, writeFileSync } = require('fs'),
	ProxyAgent = require('proxy-agent');

const stats = { threads: 0, startTime: 0, used_codes: [], submitted_codes: [], version: require('./package.json').version, working: 0 };

console.clear();
console.log(chalk.magenta(`
__  _____________   __________
_ \\/ /__    |__  | / /_  ____/
__  /__/ /| |_   |/ /_  / __  
_/ / _/ ___ |/ /|  / / /_/ /  
/_/  /_/  |_/_/ |_/  \\____/   
       ${chalk.italic.gray(`v${stats.version} - by Tenclea`)}
`));

let config = JSON.parse(readFileSync('./config.json'));
checkConfig(config);
watchFile('./config.json', () => {
	config = JSON.parse(readFileSync('./config.json'));

	// Updates logger
	logger.level = config.debugMode ? 'debug' : 'info';

	logger.info('Updated the config variables.              ');
	return checkConfig(config);
});

/* Load proxies, working proxies and removes duplicates */
const http_proxies = existsSync('./required/http-proxies.txt') ? (readFileSync('./required/http-proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '').map(p => 'http://' + p) : [];
const socks_proxies = existsSync('./required/socks-proxies.txt') ? (readFileSync('./required/socks-proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '').map(p => 'socks://' + p) : [];
const oldWorking = existsSync('./working_proxies.txt') ? (readFileSync('./working_proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '') : [];
let proxies = [...new Set(http_proxies.concat(socks_proxies.concat(oldWorking)))];

process.on('uncaughtException', () => { });
process.on('unhandledRejection', (e) => { console.error(e); stats.threads > 0 ? stats.threads-- : 0; });
process.on('SIGINT', () => { process.exit(); });
process.on('exit', () => { logger.info('Closing YANG... If you liked this project, make sure to leave it a star on github : https://github.com/Tenclea/YANG ! <3'); });

(async () => {
	await checkForUpdates();
	if (config.scrapeProxies) proxies = [...new Set(proxies.concat(await require('./utils/proxy-scrapper')()))];
	if (!proxies[0]) { logger.error('Could not find any valid proxies. Please make sure to add some in the \'required\' folder.'); process.exit(); }

	proxies = await require('./utils/proxy-checker')(proxies, config.threads);
	if (!proxies[0]) { logger.error('All of your proxies were filtered out by the proxy checker. Please add some fresh ones in the \'required\' folder.'); process.exit(); }

	logger.info(`Loaded ${chalk.yellow(proxies.length)} proxies.              `);

	const generateCode = () => {
		const code = Array.apply(0, Array(16)).map(() => {
			return ((charset) => {
				return charset.charAt(Math.floor(Math.random() * charset.length));
			})('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
		}).join('');
		return !stats.used_codes.includes(code) || stats.submitted_codes.indexOf(code) == -1 ? code : generateCode();
	};

	const checkCode = async (code, proxy, retries = 0) => {
		logStats();
		if (!proxy) { stats.threads--; return; }

		const agent = new ProxyAgent(proxy); agent.timeout = 5000;
		const url = `https://discord.com/api/v6/entitlements/gift-codes/${code}?with_application=false&with_subscription_plan=true`;
		const res = await needle('get', url, {
			agent: agent,
			follow: 10,
			response_timeout: 10000,
			read_timeout: 10000,
			rejectUnauthorized: false,
		}).catch(e => e);

		const body = res?.body;
		if (!body?.message && !body?.subscription_plan) {
			let timeout = 0;
			if (retries < 100) {
				retries++; timeout = 2500;
				logger.debug(`Connection to ${chalk.grey(proxy)} failed : ${chalk.red(res.code || 'INVALID RESPONSE')}.`);
			}
			else {
				// proxies.push(proxy); // don't remove proxy
				logger.debug(`Removed ${chalk.gray(proxy)} : ${chalk.red(res.code || 'INVALID RESPONSE')}`);
				proxy = proxies.shift();
			}

			logStats();
			return setTimeout(() => { checkCode(generateCode(), proxy, retries); }, timeout);
		}

		retries = 0; let p = proxy;
		stats.used_codes.push(code);
		if (!working_proxies.includes(proxy)) working_proxies.push(proxy);

		if (body.subscription_plan) {
			logger.info(`Found a valid gift code : https://discord.gift/${code} !`);

			// Try to redeem the code if possible
			redeemNitro(code, config);

			if (config.webhookUrl) { sendWebhook(config.webhookUrl, `(${res.statusCode}) Found a \`${body.subscription_plan.name}\` gift code in \`${ms(+new Date() - stats.startTime, { long: true })}\` : https://discord.gift/${code}.`); }

			// Write working code to file
			let codes = existsSync('./validCodes.txt') ? readFileSync('./validCodes.txt', 'UTF-8') : '';
			codes += body?.subscription_plan || '???';
			codes += ` - https://discord.gift/${code}\n=====================================================\n`;
			writeFileSync('./validCodes.txt', codes);

			stats.working++;
		}
		else if (body.message === 'You are being rate limited.') {
			// timeouts equal to 600000 are frozen. Most likely a ban from Discord's side.
			const timeout = body.retry_after;
			if (timeout != 600000) {
				proxies.push(proxy);
				logger.warn(`${chalk.gray(proxy)} is being rate limited (${(timeout / 1000).toFixed(2)}s), ${proxies[0] === proxy ? 'waiting' : 'skipping proxy'}...`);
			}
			else {
				logger.debug(`${chalk.gray(proxy)} was most likely banned by Discord. Removing proxy...`);
			}
			p = proxies.shift();
		}
		else if (body.message === 'Unknown Gift Code') {
			logger.warn(`${code} was an invalid gift code.              `);
		}
		logStats();
		return setTimeout(() => { checkCode(generateCode(), p); }, p === proxy ? (body.retry_after || 1000) : 0);
	};

	const logStats = () => {
		// Update title and write stats to stdout
		const attempts = stats.used_codes.length + stats.submitted_codes.length;
		const aps = attempts / ((+new Date() - stats.startTime) / 1000) * 60 || 0;
		process.stdout.write(`Proxies : ${chalk.yellow(proxies.length + stats.threads)} | Attempts : ${chalk.yellow(attempts)} (~${chalk.gray(aps.toFixed(0))}/min) | Working Codes : ${chalk.green(stats.working)}  \r`);
		process.title = `YANG - by Tenclea | Proxies : ${proxies.length + stats.threads} | Attempts : ${attempts} (~${aps.toFixed(0)}/min) | Working Codes : ${stats.working}`;
		return;
	};

	const threads = config.threads > proxies.length ? proxies.length : config.threads;
	logger.info(`Checking for codes using ${chalk.yellow(threads)} threads.`);

	const working_proxies = [];
	stats.startTime = +new Date();
	sendWebhook(config.webhookUrl, 'Started **YANG**.');

	const startThreads = (t) => {
		for (let i = 0; i < t; i++) {
			checkCode(generateCode(), proxies.shift());
			stats.threads++;
			continue;
		}

		logger.debug(`Successfully started ${chalk.yellow(t)} threads.`);
	};

	startThreads(threads);

	setInterval(() => {
		// Close / restart program if all proxies used
		if (stats.threads === 0) {
			logger.info('Restarting using working_proxies.txt list.');
			proxies = (readFileSync('./working_proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '');
			if (!proxies[0]) {
				logger.error('Ran out of proxies.');
				if (config.webhookUrl) return sendWebhook(config.webhookUrl, 'Ran out of proxies.').then(setTimeout(() => { process.exit(); }, 2500));
				else return process.exit();
			}
			config.saveWorkingProxies = false;
			return startThreads(config.threads > proxies.length ? proxies.length : config.threads);
		}

		/* Save working proxies */
		if (config.saveWorkingProxies) { writeFileSync('./working_proxies.txt', working_proxies.join('\n')); }
	}, 5000);

	if (config.scrapeProxies) {
		let addingProxies = false;
		setInterval(async () => {
			if (addingProxies) return;
			else addingProxies = true;

			logger.debug('Downloading updated proxies.');

			const new_http_proxies = existsSync('./required/http-proxies.txt') ? (readFileSync('./required/http-proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '').map(p => 'http://' + p) : [];
			const new_socks_proxies = existsSync('./required/socks-proxies.txt') ? (readFileSync('./required/socks-proxies.txt', 'UTF-8')).split(/\r?\n/).filter(p => p !== '').map(p => 'socks://' + p) : [];

			const newProxies = new_http_proxies.concat(new_socks_proxies.concat(await require('./utils/proxy-scrapper')())).filter(p => !working_proxies.includes(p));
			const checked = await require('./utils/proxy-checker')(newProxies, config.threads, true);
			proxies = proxies.concat(checked);

			logger.debug(`Added ${checked.length} proxies.`);
			startThreads(config.threads - stats.threads);
			addingProxies = false;
		}, 600000); // loop every 10 minutes
	}

	setInterval(async () => {
		const codes = await getCommunityCodes(stats);

		stats.submitted_codes = [...new Set(stats.submitted_codes.concat(stats.used_codes))];
		stats.used_codes = [];

		const pLength = stats.submitted_codes.length;
		stats.submitted_codes = [...new Set(stats.submitted_codes.concat(codes))];

		logger.debug(`Downloaded ${chalk.yellow(stats.submitted_codes.length - pLength)} codes from the community.              `);
	}, 30_000);
})();