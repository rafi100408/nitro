const chalk = require('chalk'),
	logger = require('./logger'),
	ms = require('ms'),
	needle = require('needle'),
	ProxyAgent = require('simple-proxy-agent');

module.exports = async (proxies, threads, maxRetries = 4) => {

	if (threads > proxies.length) threads = proxies.length;
	logger.info(`Checking ${chalk.yellow(proxies.length)} proxies... This might take up to ${ms((proxies.length * (maxRetries + 1) * 10000) / threads, { long: true })}.`);

	proxies = await new Promise(complete => {
		const checkProxy = async (p, ret = 0) => {

			const res = await needle('get', 'https://discordapp.com/api/v6/experiments', {
				agent: new ProxyAgent('http://' + p, { tunnel: true, timeout: 5000 }),
				follow: 10,
				response_timeout: 10000,
				read_timeout: 5000,
			}).catch(e => e);

			if (res?.body?.fingerprint) checked.push(p);

			if (ret < maxRetries) { ret++; }
			else { p = proxies.shift(); ret = 0; }

			log();
			if (p) { checkProxy(p, ret); }
			else { threads--; }

			return;
		};

		const log = () => {
			const eta = (((proxies.length + threads) * (maxRetries + 1) * 10000) / threads) || 1;
			const time = [new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()].map(t => { if (t < 10) { t = '0' + t; } return t; });
			process.stdout.write(`${chalk.magenta(time.join(':'))} ${chalk.greenBright('[INFO]')}  » Proxies left : ${proxies.length + threads} | Working : ${checked.length} | Max. time left : ~${ms(eta, { long: true })}      \r`);
			process.title = `Checking proxies... | Proxies left : ${proxies.length + threads} | Working : ${checked.length} | ETA : ${ms(eta, { long: true })}`;
			return;
		};

		const checked = [];
		for (let i = 0; i < threads; i++) {
			checkProxy(proxies.shift(), 0);
		}

		const done = setInterval(() => {
			log();
			if (threads <= 0) {
				clearInterval(done);
				complete(checked);
			}
		}, 100);
	});

	return proxies;
};