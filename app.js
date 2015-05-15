var EventEmitter = require('events').EventEmitter;
var cheerio = require('cheerio');
var request = require('request');
var cfg = require('./config.js');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: cfg.mail.user,
		pass: cfg.mail.pass
	}
});
var notificator = new EventEmitter();
var REFRESH_TIME = cfg.refreshTime;
//generate array of objects currency.self will store the currency pair
var currencyList = cfg.currencyList.map(function(e) {
	return {
		self: e,
		isActive: false,
	};
});


// the url from where will get data, at the ant of url will pe  concatenated the currency pair
var URL = 'http://forexbanksignals.com/control_panel/trade.php?smb=';

function getData(currency, cb) {
	var url = URL + currency.self;
	request(url, function(error, response, html) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(html);
			var data = $('p').text();
			if (verifyStatus(data)) {
				// if is activated
				currency.msg = data; //store message into the object
				notificator.emit('notify', currency); // send object to the event
			} else {
				currency.isActive = false;
			}
		}
	});
}


// check if contains  word Activated
function verifyStatus(data) {
	var result = data.search('Activated');
	if (result > 0) {
		return true;
	} else {
		return false;
	}
}

notificator.on('notify', function(currency) {
	if (!currency.isActive) {
		currency.isActive = true;
		//send push message	
		transporter.sendMail({
			from: 'sender@address',
			to: cfg.sendTo,
			subject: 'Report',
			text: currency.msg
		});

	}
});

//start
setInterval(function() {
	currencyList.forEach(function(currency) {
		getData(currency);
	});
}, REFRESH_TIME);