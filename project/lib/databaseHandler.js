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
  var scope = this; // For usage in callbacks

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
    return Q.promise(function(resolve, reject, notify) {
      /* istanbul ignore if */
      if(!connected) reject(new errors.DatabaseError("Not connected to database"));
      else if (!mongodb.ObjectId.isValid(id)) reject(new errors.ArgumentError("id is invalid"));
      else {
        getCollection(config.get('database:collections:auth')).updateOne({_id: id}, {$set: params})
        .then((doc) => { if (!doc.result.nModified) throw new errors.ArgumentError("No user updated"); })
        .then(() => scope.getUser({_id: id}))
        .then((doc) => resolve(doc))
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

  this.getManyById = function(ids) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!Array.isArray(ids)) reject(new errors.ArgumentError("ids should be an array of valid IDs"));
      else if (ids.some((id) => !mongodb.ObjectId.isValid(id))) reject(new errors.ArgumentError("Invalid IDs"));
      else {
        getCollection(config.get('database:collections:auth')).find({_id: {$in: ids} }).toArray()
        .then((res) => resolve(res))
        .catch(reject);
      }
    });
  };

  this.registerUser = function(params) {
    var scope = this;
    var requiredParams = ['username', 'password'];
    return Q.Promise(function(resolve, reject, notify) {
      // Make sure all are set
      if (!Object.keys(params).every(s => requiredParams.indexOf(s) >= 0)) {
        reject(new errors.ArgumentError("Only username and password should be specified"));
      }
      else if ([params.username, params.password].some(s => !s || typeof s !== 'string' || !s.trim())) {
        reject(new errors.ArgumentError("Username and hash must be specified"));
      }
      /* istanbul ignore if */
      else if (!connected) {
        reject(new errors.DatabaseError("Not connected to database"));
      }
      else {
        // https://gist.github.com/Vakz/77b59958973ad49785b9
        scope.getUser({username: params.username})
        .then(function(doc) {
          if (doc) throw new errors.ArgumentError("Username already taken");
        })
        .then(() => params._id = generateId())
        .then(() => UserSecurity.generateToken(config.get('security:sessions:tokenLength')))
        .then((val) => params.token = val)
        .then(() => getCollection(config.get('database:collections:auth')).insertOne(params))
        .then((doc) => resolve(doc.ops[0]))
        .catch(reject);
      }
    });
  };

  this.getUser = function(params) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!connected) reject(new errors.DatabaseError("Not connected to database"));
      Q.Promise(function(resolve) {
        prepareParams(params);
        resolve();
      })
      .then(function() {
        if (Object.keys(params).length === 0)
          throw new errors.ArgumentError("Must specficy at least one parameter");
      })
      .then(() => getCollection(config.get('database:collections:auth')).findOne(params))
      .then(resolve)
      .catch(reject);
    });
  };

  this.updateToken = function(id) {
    return Q.Promise(function(resolve, reject, notify) {
      if (typeof id !== 'string' || !mongodb.ObjectId.isValid(id)) reject(new errors.ArgumentError("Not a valid id"));
      else {
        UserSecurity.generateToken(config.get('security:sessions:tokenLength'))
        .then((res) => genericUpdateUser(id, {token: res}))
        .then((res) => resolve(res.token))
        .catch(function(err) {
          if (err instanceof errors.ArgumentError) reject(new errors.ArgumentError("No user with id " + id));
          // If error is not an ArgumentError, it's likely something thrown from mongodb. Pass it on.
          else throw (err);
        })
        .catch(reject);
      }
    });
  };

  this.updatePassword = function(id, password, resetToken) {
    return Q.Promise(function(resolve, reject, notify) {
      Q.Promise(function(resolve, reject) {
        if (resetToken) scope.updateToken(id).then(resolve);
        else resolve();
      }).then( () => genericUpdateUser(id, {'password': password}))
      .then((res) => resolve(res))
      .catch(reject);
    });
  };

};

module.exports = DatabaseHandler;
