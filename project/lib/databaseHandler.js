"use strict";

var errors = require('./errors')
var mongodb = require('mongodb');
var config = require('./config')
var ObjectID = mongodb.ObjectID;

var DatabaseHandler = function() {
  var db = null;
  var connected = false;
  var collections = {};

  var getCollection = function(collection) {
    if (!collections.hasOwnProperty(collection)) {
      collections[collection] = db.collection(collection);
    }
    return collections[collection];
  }

  this.connect = function(callback) {
    if (connected) {
      if (callback) callback(new Error("Already connected"), null);
      return;
    }
    // Create db conneciton
    mongodb.MongoClient.connect(
      config.get('database:address') + config.get('database:db'),
      function(err, _db) {
        if (err) {
          callback(err, null)
          return;
        }
        db = _db;
        if (callback) callback(null, true);
        connected = true;
      });
  }

  this.close = function() {
    if (db) db.close();
    connected = false;
    db = null;
  };

  this.registerUser = function(params, callback) {
    // Make sure all are set
    if ([params.username, params.salt, params.password].some(s => !s || !s.trim())) {
      if (callback)
        callback(new errors.ArgumentError("Username, salt and hash must be specified"), null);
      return;
    }
    else if (Object.keys(params).length != 3) {
      if (callback)
        callback(new errors.ArgumentError("Only username, salt and password should be specified"));
      return;
    }
    if (!connected) {
      if (callback) callback(new errors.DatabaseError("Not connected to database"), null)
      return;
    }
    var authCollection = getCollection(config.get('database:collections:auth'));
    // Check if username is taken
    authCollection.find({username: params.username}).toArray(function(err, docs) {
      if (err) {
        if(callback) callback(err);
        return;
      }
      else {
        if (docs.length != 0) callback(new errors.ArgumentError("Username already taken"));
        else {
          authCollection.insertOne(params
          , function(err, res) {
            if (callback) {
              if (err) {
                callback(new err, null);
              }
              else {
                callback(null, res.ops[0]);
              }
            }
          });
        }
      }
    });
  };

  this.getUser = function(params, callback) {
    if(!connected) {
      if (callback) callback(new errors.DatabaseError("Not connected to database"), null);
      return;
    }
    // Delete specified but empty parameters to ensure at least one is valid
    Object.keys(params).forEach(function(key) {
      if (!(typeof params[key] === 'string')) return;
      if (!params[key] || !params[key].trim())
      {
        delete params[key];
      }
    });
    if (Object.keys(params).length == 0) {
      if (callback) callback(new errors.ArgumentError("Must specficy at least one parameter"), null);
      return;
    }
    db.collection(config.get('database:collections:auth')).findOne(params, function(err, res) {
      if (err) {
        if (callback) callback(err, null);
        return;
      }
      callback(null, res);
    });
  }
}

module.exports = DatabaseHandler;
