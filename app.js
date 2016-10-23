'use strict'

/* Dependencies
---------------------------------------------*/
const debug = require('debug')("hootsuite-webhook:app.js");
const config = require('config').get("config");
const bodyParser  = require( 'body-parser' );
const express = require('express');
const app = express();
const mongoose = require('mongoose'); 
const CronJob = require('cron').CronJob;
const moment = require('moment');

/* Global variables
---------------------------------------------*/
var _jobs = new Array();


/* Database
---------------------------------------------*/
mongoose.connect(config.mongoUrl, function(err, res) {  
  if(err) 
    debug('ERROR: connecting to Database. ' + err);
  else 
    debug('Connected to mongodb.');
});
mongoose.Promise = require('q').Promise;

var Destination = require('./lib/destination.js');
var Message = require('./lib/message.js');

/* cronJobs
---------------------------------------------*/
function deletePendingMessages() {
	try {
		debug('Running job deletePendingMessages at ' + new Date());

		// Messages not sent within N hours can be be deleted 
		var lastHour = moment(new Date()).utcOffset(0).subtract(config.expirationTimeInHours, 'hour');
		Message.findByQuery({ "createdAt" : {"$lte": lastHour.format()} }).then(function(messageList) {
			messageList.forEach(function(message) {
				Message.delete(message).then(function(removedMessage){
					debug('Removed message ' + removedMessage._id) + ' due inactivity.';
				})
			})
		})

		// Messages that failed to send should retried N or more times before they are deleted
		Message.findByQuery({ "retryCount" : {"$gte": parseInt(config.requestRetryCount)} }).then(function(messageList) {
			messageList.forEach(function(message) {
				Message.delete(message).then(function(removedMessage){
					debug('Removed message ' + removedMessage._id + ' due exceeded retryCount.');
				})
			})
		})
	}
	catch(ex) {
		debug(ex);
	}
}

function retrySendMessages() {
	try {
		debug('Running job retrySendMessages at ' + new Date());

		Message.findByQuery({ "sent": false, "retryCount" : {"$lte": (config.requestRetryCount - 1)} }).then(function(messageList) {
			messageList.forEach(function(message) {
				// Try request
				Message.trySend(message).then(function(body) {
					message.sent = true;
					Message.update(message).then(function() {
						debug('Message ' + message._id + ' sent successfully!');
					}); 
				}, function(err){
					// Increase the retryCount
					message.retryCount++;
					Message.update(message).then(function() {
						debug('Message ' + message._id + ' could not be sent, retrying...');
					}); 
				});
			})
		})
	}
	catch(ex) {
		debug(ex);
	}
}

// Delete Pending Destinations
_jobs.push(new CronJob({
     cronTime: config.jobs.deletePendingMessagesCronTime, 
     onTick: function(){ deletePendingMessages() },
     onComplete: function() { debug('Job ended!'); },
     timeZone: config.jobs.timezone,
     start: false
}));

// Retry sending requests
_jobs.push(new CronJob({
     cronTime: config.jobs.retrySendMessagesCronTime, 
     onTick: function(){ retrySendMessages() },
     onComplete: function() { debug('Job ended!'); },
     timeZone: config.jobs.timezone,
     start: false
}));

debug('Starting jobs...');
_jobs.forEach(function (job) { job.start(); });

/* Routes
---------------------------------------------*/
// Parse different body formats
app.use( bodyParser.json() );
app.use( bodyParser.text() );
app.use( bodyParser.raw() );

// Create routes
var apiRouter = express.Router();

apiRouter.route("/destination")
    .get(function(req, res) {
    		// List registered destinations [{id, URL},...]
    		debug('GET /destination');

		Destination.findList().then(function(destinationList) {
			res.status(200).json(destinationList);  
		}, function(err) {
			res.status(500).json(errFind); 
		});
    })
    .post(function(req, res) {
    		// Register a new destination (URL) returning its id 
    		debug('POST /destination');

    		// Validate request types
    		if(!req.headers['content-type'] || req.headers['content-type'] !== 'application/json')
			res.status(400).json('Required field "content-type" should be "application/json" in the request header.');    
    		else if(!req.body.URL) 
			res.status(400).json('Required field "URL" not found in the request body.');    
		else if(req.body.URL.indexOf('http://') == -1 && req.body.URL.indexOf('https://') == -1) 
			res.status(400).json('URL should have http:// or https://');  	
		else {
			// Parse URL to check if is local
			var parsedUrl = req.body.URL;

			if(parsedUrl.indexOf('://') != -1)
				parsedUrl = parsedUrl.split('://')[1].split('/')[0];

			if(config.invalidURLs.indexOf(parsedUrl) != -1) 
				res.status(400).json('Invalid URL.');    	
			else {
				// Check if URL is already inserted
				Destination.findByQuery({URL: req.body.URL}).then(function(destinationList) {
					// Just return it's id
					if(destinationList.length === 1) {
						res.status(200).json(destinationList[0]._id); 
					}
					else {
						// Save and return it's id
						Destination.create(req.body).then(function(destination){
							res.status(200).json(destination._id); 
						}, function(errSave){
							res.status(500).json(errSave);  
						})
					}
				}, function(errFind) {
					res.status(500).json(errFind);  
				});
			}
		} 
    })

apiRouter.route("/destination/:id")
	.delete(function(req, res) {
    		debug('DELETE /destination/:id')

		Destination.deleteById(req.params.id).then(function() {
			res.status(200).json();  
		}, function(err) {
			res.status(500).json(err);  
		});
     })

apiRouter.route("/message/:destinationId")
     .post(function(req, res) {
    		// Creates a message to a specific destination
    		debug('POST /message/:destinationId')

    		// Find destination
		Destination.findById(req.params.destinationId).then(function(destinationFind) {
			if(!destinationFind) 
				res.status(404).json('Destination with id "' + req.params.id + '" not found.');  
			else {
				// Create the message
				var mewMessage = {
					URL: destinationFind.URL,
					contentType: req.headers['content-type'],
					body: JSON.stringify(req.body)
				}

				// Try update
				Message.create(mewMessage).then(function(createdMessage) {
					// Try request
					Message.trySend(createdMessage).then(function(body) {
						// Delete message sent successfully
						createdMessage.sent = true;
						Message.update(createdMessage);

						// Try parse body into json (in body is jsonstring)
						try { body = JSON.parse(body); }
						catch(ex) { debug(ex); }

						res.status(200).json(body);  

					}, function(err){
						res.status(503).json('Destination rejected the message. It will retry 3 more times. If destination could not process this message, it will be deleted automatically!');  
					});
				}, function(err) {
					res.status(500).json(err);
				});
			}
		}, function(err) {
			if(err) {
				if(err.name === 'CastError')
					res.status(400).json('Invalid Id! A valid id example: 578850659c1d21d4170eb136');  
				else
					res.status(500).json(err);  
			}
		});
     })
     
app.use('/', apiRouter);

// Error handling
app.use(function(err, req, res, next) { console.error(err.stack); });

// Starting http server
var http = require('http').Server(app);
http.listen(config.port, function () {
  debug('HTTP server ready at port ' + config.port); 
});

