"use strict";

var errors = require('./errors');
var mongodb = require('mongodb');
var config = require('./config');
var ObjectID = mongodb.ObjectID;

var db;
var connected;
var collections;

var getCollection = function(collection) {
  if (!collections.hasOwnProperty(collection)) {
    collections[collection] = db.collection(collection);
  }
  return collections[collection];
};


/*
 * Deletes empty parameters. If a _id parameter is present, converts it
 * to an ObjectID.
 */
var prepareParams = function(params) {
  Object.keys(params).forEach(function(key) {
    if (typeof params[key] !== 'string') return;
    if (!params[key] || !params[key].trim())
    {
      delete params[key];
    }
  });
  if (params.hasOwnProperty('_id')) params._id = new ObjectID(params._id);
};

class DatabaseHandler {
  constructor() {
    db = null;
    connected = false;
    collections = {};
  }

  connect(callback) {
    if (connected) {
      /* istanbul ignore else */
      if (callback) callback(new errors.DatabaseError("Already connected"), null);
      return;
    }
    // Create db conneciton
    mongodb.MongoClient.connect(
      config.get('database:address') + config.get('database:db'),
      function(err, _db) {
        /* istanbul ignore if */
        if (err) {
          if (callback) callback(err, null);
          return;
        }
        db = _db;
        /* istanbul ignore else */
        if (callback) callback(null, true);
        connected = true;
      });
  }

  close(callback) {
    if (db) db.close(callback);
    else callback(new errors.DatabaseError("Database already closed"), null);
    connected = false;
    db = null;
  }

  registerUser(params, callback) {
    // Make sure all are set
    if ([params.username, params.salt, params.password].some(s => !s || !s.trim())) {
      /* istanbul ignore else */
      if (callback)
        callback(new errors.ArgumentError("Username, salt and hash must be specified"), null);
      return;
    }
    else if (Object.keys(params).length != 3) {
      /* istanbul ignore else */
      if (callback)
        callback(new errors.ArgumentError("Only username, salt and password should be specified"));
      return;
    }
    /* istanbul ignore if */
    if (!connected) {
      if (callback) callback(new errors.DatabaseError("Not connected to database"), null);
      return;
    }
    var authCollection = getCollection(config.get('database:collections:auth'));
    // Check if username is taken
    authCollection.find({username: params.username}).toArray(function(err, docs) {
      /* istanbul ignore if */
      if (err) {
        if(callback) callback(err);
        return;
      }
      else {
        if (docs.length !== 0)
        {
          /* istanbul ignore else */
          if (callback) callback(new errors.ArgumentError("Username already taken"));
        }
        else {
          authCollection.insertOne(params, function(err, res) {
            /* istanbul ignore else */
            if (callback) {
              /* istanbul ignore if */
              if (err) {
                if (callback) callback(err, null);
              }
              else {
                res.ops[0]._id = res.ops[0]._id.toString();
                callback(null, res.ops[0]);
              }
            }
          });
        }
      }
    });
  }

  getUser(params, callback) {
    if(!connected) {
      /* istanbul ignore else */
      if (callback) callback(new errors.DatabaseError("Not connected to database"), null);
      return;
    }
    // Delete specified but empty parameters to ensure at least one is valid
    prepareParams(params);
    if (Object.keys(params).length === 0) {
      /* istanbul ignore else */
      if (callback) callback(new errors.ArgumentError("Must specficy at least one parameter"), null);
      return;
    }
    db.collection(config.get('database:collections:auth')).findOne(params, function(err, res) {
      /* istanbul ignore if */
      if (err) {
        if (callback) callback(err, null);
        return;
      }
      if(res) res._id = res._id.toString();
      callback(null, res);
    });
  }
}

module.exports = DatabaseHandler;
