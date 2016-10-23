
const debug = require('debug')("hootsuite-webhook:destination.js");
const mongoose = require('mongoose');
const Q = require('q'); 
const request = require('request');

var destinationSchema = new mongoose.Schema({  
	URL: {type: String, required: true}
}, {collection: 'hootsuite-webhook-destinations'});

var Destination = mongoose.model('Destination', destinationSchema);

module.exports = {
	model: Destination,
	findList: function() {
		var deferred = Q.defer();

		try {
			Destination.find({}, '-__v').exec(function(errFind, destinationFind) {
				if(errFind) 
					deferred.reject(errFind);  
				else 
					deferred.resolve(destinationFind);  
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
			Destination.findById(id, '-__v').exec(function(errFind, destinationFind) {
				if(errFind) 
					deferred.reject(errFind);  
				else 
					deferred.resolve(destinationFind);  
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
			Destination.find(query, '-__v').exec(function(errFind, destinationFind) {
				if(errFind) 
					deferred.reject(errFind);  
				else 
					deferred.resolve(destinationFind);  
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
			var newDestination = new Destination(body);
			newDestination.createdAt = new Date();
			newDestination.messages = [];

			newDestination.save(function(errSave, destinationSave) {
				if(errSave) 
					deferred.reject(errSave);  
				else 
					deferred.resolve(destinationSave);  
			});
		}
		catch(ex) {
			deferred.reject(ex); 
		}

		return deferred.promise;
	},
	update: function(newDestination) {
		var deferred = Q.defer();

		try {
			newDestination.save(function(err) {
				if(err) 
					deferred.reject(err); 
				else 
					deferred.resolve(newDestination);  
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
		
		self.findById(id).then(function(destination){
			destination.remove(function(err,removed) {
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
	delete: function(destination) {
		var deferred = Q.defer();
		
		destination.remove(function(err,removed) {
			if(err) 
				deferred.reject(err); 
			else 
				deferred.resolve(removed);  
		});

		return deferred.promise;
	}
} 