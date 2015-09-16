"use strict";

var errors = require('./errors');
var config = require('./config');
var Q = require('q');

var db;
var connected;
var collections;

var getCollection = function(collection) {
  if (!collections.hasOwnProperty(collection)) {
    collections[collection] = db.get(collection);
  }
  return collections[collection];
};


/*
 * Deletes empty parameters.
 */
var prepareParams = function(params) {
  Object.keys(params).forEach(function(key) {
    if (typeof params[key] !== 'string') return;
    if (!params[key] || !params[key].trim())
    {
      delete params[key];
    }
  });
};

class DatabaseHandler {
  constructor() {
    db = null;
    connected = false;
    collections = {};
  }

  connect() {
    if (connected) return;
    db = require('monk')(config.get('database:address') + config.get('database:db'));
    connected = true;
  }

  close() {
    if (db) db.close();
    connected = false;
    db = null;
  }

  registerUser(params) {
    return Q.Promise(function(resolve, reject, notify) {
      // Make sure all are set
      if ([params.username, params.salt, params.password].some(s => !s || !s.trim())) {
        reject(new errors.ArgumentError("Username, salt and hash must be specified"));
      }
      else if (Object.keys(params).length != 3) {
        reject(new errors.ArgumentError("Only username, salt and password should be specified"));
      }
      else if (!connected) {
        reject(new errors.DatabaseError("Not connected to database"));
      }
      else {
        var authCollection = getCollection(config.get('database:collections:auth'));
        // Check if username is taken
        var res = authCollection.findOne({username: params.username});
        res.error(reject).success(function (doc) {
          if (doc) reject(new errors.ArgumentError("Username already taken"));
          else {
            authCollection.insert(params).error(reject).success(resolve);
          }
        });
      }
    });
  }

  getUser(params) {
    return Q.Promise(function(resolve, reject, notify) {
      if(!connected) {
        reject(new errors.DatabaseError("Not connected to database"));
      }
      else
      {
        // Delete specified but empty parameters to ensure at least one is valid
        prepareParams(params);
        if (Object.keys(params).length === 0) {
          reject(new errors.ArgumentError("Must specficy at least one parameter"));
          return;
        }
        var res = getCollection(config.get('database:collections:auth')).findOne(params);
        res.error(reject).success(resolve);
      }
    });
  }
}

module.exports = DatabaseHandler;
