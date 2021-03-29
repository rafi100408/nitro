const logger = require('./logger'),
	needle = require('needle');

module.exports = async () => {
	const proxySites = [
		'https://api.proxyscrape.com/?request=displayproxies&status=alive&proxytype=https',
		'https://api.proxyscrape.com/?request=displayproxies&status=alive&proxytype=http',
		'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
		'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
		'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/https.txt',
		'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt',
		'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
		'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
	];

	const scrapped = proxySites.map(async s => {
		const res = await new Promise(resolve => {
			needle.get(s, (e, r, body) => {
				if (e) logger.error(`Could not request proxies from ${s} > ${e}`);
				resolve(body);
			});
		});
		return res.split(/\r?\n/).filter(p => p !== '');
	});

	return await Promise.all(scrapped).then(values => values.reduce((a, b) => a.concat(b), [])).catch(e => logger.error(e));
};