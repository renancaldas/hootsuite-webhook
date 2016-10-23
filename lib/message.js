
const debug = require('debug')("hootsuite-webhook:message.js");
const mongoose = require('mongoose');
const Q = require('q'); 
const request = require('request');

var messageSchema = new mongoose.Schema({ 
	createdAt: {type: Date, required: true},
	URL: {type: String, required: true},
	contentType: {type: String, required: true},
	body: {type: String, required: true},
	retryCount: {type: Number, required: true},
	sent: {type: Boolean, required: true}
}, {collection: 'hootsuite-webhook-messages'});

var Message = mongoose.model('Message', messageSchema);

module.exports = {
	model: Message,
	findList: function() {
		var deferred = Q.defer();

		try {
			Message.find({}, '-__v').exec(function(errFind, messageFind) {
				if(errFind) 
					deferred.reject(errFind);  
				else 
					deferred.resolve(messageFind);  
			});
		}
		catch(ex) {
			deferred.reject(ex); 
		}

		return deferred.promise;
	},
	findById: function(id) {
		var deferred = Q.defer();

		try {
			Message.findById(id, '-__v').exec(function(errFind, messageFind) {
				if(errFind) 
					deferred.reject(errFind);  
				else 
					deferred.resolve(messageFind);  
			});
		}
		catch(ex) {
			deferred.reject(ex); 
		}

		return deferred.promise;
	},
	findByQuery: function(query) {
		var deferred = Q.defer();

		try {
			Message.find(query, '-__v').exec(function(errFind, messageFind) {
				if(errFind) 
					deferred.reject(errFind);  
				else 
					deferred.resolve(messageFind);  
			});
		}
		catch(ex) {
			deferred.reject(ex); 
		}

		return deferred.promise;
	},
	create: function(body) {
		var deferred = Q.defer();
		var self = this;

		try {
			var newMessage = new Message(body);
			newMessage.createdAt = new Date();
			newMessage.retryCount = 0;
			newMessage.sent = false;

			newMessage.save(function(errSave, messageSave) {
				if(errSave) 
					deferred.reject(errSave);  
				else 
					deferred.resolve(messageSave);  
			});
		}
		catch(ex) {
			deferred.reject(ex); 
		}

		return deferred.promise;
	},
	update: function(newMessage) {
		var deferred = Q.defer();

		try {
			newMessage.save(function(err) {
				if(err) 
					deferred.reject(err); 
				else 
					deferred.resolve(newMessage);  
			});
		}
		catch(ex) {
			deferred.reject(ex); 
		}

		return deferred.promise;
	},
	deleteById: function(id) {
		var deferred = Q.defer();
		var self = this;
		
		self.findById(id).then(function(message){
			message.remove(function(err,removed) {
				if(err) 
					deferred.reject(err); 
				else 
					deferred.resolve(removed);  
			});
		}, function(err) {
			deferred.reject(err); 
		});

		return deferred.promise;
	},
	delete: function(message) {
		var deferred = Q.defer();
		
		message.remove(function(err,removed) {
			if(err) 
				deferred.reject(err); 
			else 
				deferred.resolve(removed);  
		});

		return deferred.promise;
	},
	trySend: function (message) {
		var deferred = Q.defer();

		request({
			method: 'POST',
			url: message.URL, 
			headers: { 'Content-Type': message.contentType },
			body: message.body
		}, function(error, response, body) {
			if(error || response.statusCode !== 200) 
				deferred.reject(error);
			else 
				deferred.resolve(body);  
		});

		return deferred.promise;
	}
} 