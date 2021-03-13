const chalk = require('chalk'),
	logger = require('./logger'),
	ms = require('ms'),
	needle = require('needle');

module.exports = async (proxies, threads, maxRetries) => {

	if (threads > proxies.length) threads = proxies.length;
	logger.info(`Checking proxies... This will take up to ${ms(30 * ((proxies.length * (maxRetries + 1)) / threads) * 1000, { long: true })}.`);

	proxies = await new Promise(complete => {
		const checkProxy = async (p, retry) => {
			await new Promise(resolve => {
				needle.get('https://discordapp.com/api/v6/experiments', { proxy: p, response_timeout: 10000, read_timeout: 10000 }, (err, res) => {
					log();
					if (!err && res.body.fingerprint) { checked.push(p); }
					else if (retry < maxRetries) { retry++; return checkProxy(p, retry); }

					if (proxies.length === 0) { threads--; resolve('done'); }
					else { checkProxy(proxies.shift(), 0); }
				});
			});
		};

		const log = () => {
			const time = [new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()].map(t => { if (t < 10) { t = '0' + t; } return t; });
			process.stdout.write(`${chalk.magenta(time.join(':'))} ${chalk.greenBright('[INFO]')}  » Proxies left : ${proxies.length + threads} | Working : ${checked.length}     \r`);
			return;
		};

		const checked = [];
		for (let i = 0; i < threads; i++) {
			checkProxy(proxies.shift(), 0);
		}

		const done = setInterval(() => {
			if (threads === 0) {
				clearInterval(done);
				complete(checked);
			}
		}, 500);
	});

	return proxies;
};