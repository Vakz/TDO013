"use strict";

var errors = require('./errors')
var mongodb = require('mongodb');
var config = require('./config')

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
          callback(new errors.DatabaseError(err), null)
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

  this.registerUser = function(uname, salt, pwHash, callback) {
    // Make sure all are set
    if ([uname, salt,pwHash].some(s => !s.trim())) {
      if (callback) callback(new errors.ArgumentError("Username, salt and hash must be specified"), null);
      return;
    }
    if (!connected) {
      if (callback) callback(new errors.DatabaseError("Not connected to database"), null)
      return;
    }
    var authCollection = getCollection(config.get('database:collections:auth'));
    // Check if username is taken
    authCollection.find({username: uname}).toArray(function(err, docs) {
      if (err) callback(new errors.DatabaseError(err));
      else {
        if (docs.length != 0) callback(new errors.ArgumentError("Username already taken"));
        else {
          authCollection.insertOne({username: uname, password: pwHash, 'salt': salt}
          , function(err, res) {
            if (err) callback(new errors.DatabaseError(err), null);
            else callback(null, res.ops[0]);
          })
        }
      }
    });
  }
}

module.exports = DatabaseHandler;
