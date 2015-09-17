"use strict";

var errors = require('./errors');
var config = require('./config');
var UserSecurity = require('./userSecurity');
var Q = require('q');
var mongodb = require('mongodb');

var DatabaseHandler = function() {
  var db = null;
  var connected = false;
  var collections = {};

  var getCollection = function(collection) {
    if (!collections.hasOwnProperty(collection)) {
      collections[collection] = db.collection(collection);
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

  var generateId = () => (new mongodb.ObjectId()).toString();

  var genericUpdateUser = function(id, params) {
    var scope = this;
    return Q.promise(function(resolve, reject, notify) {
      /* istanbul ignore if */
      if(!connected) reject(new errors.DatabaseError("Not connected to database"));
      else if (!mongodb.ObjectId.isValid(id)) reject(new errors.ArgumentError("id is invalid"));
      else {
        getCollection(config.get('database:collections:auth')).updateOne({_id: id}, params)
        .then((doc) => { if (!doc.result.nModified) throw new errors.ArgumentError("No user updated"); })
        .then(() => scope.getUser({_id: id}))
        .then((doc) => resolve(doc.token))
        .catch(reject);
      }
    });
  };

  this.connect = function(){
    return Q.Promise(function(resolve, reject, notify)
    {
      if (connected) resolve(true);
      else {
        var address = config.get('database:address') + config.get('database:db');
        var dbConnect = mongodb.MongoClient.connect(address);

        var successful = function(_db) {
          db = _db;
          connected = true;
          resolve(true);
        };

        dbConnect.then(successful, reject);
      }
    });
  };

  this.close = function() {
    if (db) db.close();
    connected = false;
    db = null;
  };


  this.registerUser = function(params) {
    var scope = this;
    var requiredParams = ['username', 'salt', 'password'];
    return Q.Promise(function(resolve, reject, notify) {
      // Make sure all are set
      if (!Object.keys(params).every(s => requiredParams.indexOf(s) >= 0)) {
        reject(new errors.ArgumentError("Only username, salt and password should be specified"));
      }
      else if ([params.username, params.salt, params.password].some(s => !s || typeof s !== 'string' || !s.trim())) {
        reject(new errors.ArgumentError("Username, salt and hash must be specified"));
      }
      /* istanbul ignore if */
      else if (!connected) {
        reject(new errors.DatabaseError("Not connected to database"));
      }
      else {
        var authCollection = getCollection(config.get('database:collections:auth'));
        // Check if username is taken

        var res = scope.getUser({username: params.username});

        res.then(function(doc) {
          if (doc) {
            reject(new errors.ArgumentError("Username already taken"));
          }
          else {
            var tokenLength = config.get('security:sessions:tokenLength');
            UserSecurity.generateToken(tokenLength).then(function(val) {
              params.token = val;
              params._id = generateId();
              authCollection.insertOne(params).then((doc) => resolve(doc.ops[0]), reject);
            }, reject).done();
          }
        }, reject).done();
      }
    });
  };

  this.getUser = function(params) {
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

        var authCollection = getCollection(config.get('database:collections:auth'));
        authCollection.findOne(params).then(resolve, reject);
      }
    });
  };

  this.updateToken = function(id) {
    return Q.Promise(function(resolve, reject, notify) {
      UserSecurity.generateToken(config.get('security:sessions:tokenLength'))
      .then(function(res) {
        genericUpdateUser({$set: {token: res}})
        .then(resolve)
        .catch(() => reject(new errors.ArgumentError("No user with id " + id)));
      });
    });
  };

  this.updatePassword = function(id, password, resetToken) {
    return Q.promise(function(resolve, reject, notify) {
      if(!connected) reject(new errors.DatabaseError("Not connected to database"));
      else if (!mongodb.ObjectId.isValid(id)) reject(new errors.ArgumentError("id is invalid"));
      else {

      }
    });
  };

};

module.exports = DatabaseHandler;
