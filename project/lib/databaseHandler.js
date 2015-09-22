"use strict";

var ArgumentError = require('./errors').ArgumentError;
var DatabaseError = require('./errors').DatabaseError;
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
      if(!connected) reject(new DatabaseError("Not connected to database"));
      else if (!mongodb.ObjectId.isValid(id)) reject(new ArgumentError("id is invalid"));
      else {
        getCollection(config.get('database:collections:auth')).updateOne({_id: id}, {$set: params})
        .then((doc) => { if (!doc.result.n) throw new ArgumentError("No user updated"); })
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
      if (!Array.isArray(ids)) reject(new ArgumentError("ids should be an array of valid IDs"));
      else if (ids.some((id) => !mongodb.ObjectId.isValid(id))) reject(new ArgumentError("Invalid IDs"));
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
        reject(new ArgumentError("Only username and password should be specified"));
      }
      else if ([params.username, params.password].some(s => !s || typeof s !== 'string' || !s.trim())) {
        reject(new ArgumentError("Username and hash must be specified"));
      }
      /* istanbul ignore if */
      else if (!connected) {
        reject(new DatabaseError("Not connected to database"));
      }
      else {
        // https://gist.github.com/Vakz/77b59958973ad49785b9
        scope.getUser({username: params.username})
        .then(function(doc) {
          if (doc) throw new ArgumentError("Username already taken");
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
      if (!connected) reject(new DatabaseError("Not connected to database"));
      Q.Promise(function(resolve) {
        prepareParams(params);
        resolve();
      })
      .then(function() {
        if (Object.keys(params).length === 0)
          throw new ArgumentError("Must specficy at least one parameter");
      })
      .then(() => getCollection(config.get('database:collections:auth')).findOne(params))
      .then(resolve)
      .catch(reject);
    });
  };

  this.updateToken = function(id) {
    return Q.Promise(function(resolve, reject, notify) {
      UserSecurity.generateToken(config.get('security:sessions:tokenLength'))
      .then((res) => genericUpdateUser(id, {token: res}))
      .then((res) => resolve(res.token))
      .catch(function(err) {
        if (err instanceof ArgumentError) reject(new ArgumentError("No user with id " + id));
        // If error is not an ArgumentError, it's likely something thrown from mongodb. Pass it on.
        else throw (err);
      })
      .catch(reject);
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

  this.searchUsers = function(searchword) {
    return Q.Promise(function(resolve, reject, notify)
    {
      if (!searchword || typeof searchword !== 'string' || !searchword.trim()) {
        reject(new ArgumentError('Searchword cannot be empty'));
      }
      else {
        getCollection(config.get('database:collections:auth'))
        .find({"username": new RegExp(searchword)}).toArray()
        .then(resolve, reject);
      }
    });
  };

  this.newMessage = function(from, to, message) {
    return Q.Promise(function(resolve, reject, notify) {
      scope.getManyById([from, to])
      .then(function(res) {
        if (res.length !== 2 || res.some((doc) => !doc)) throw new ArgumentError("User not found");
      })
      .then(function() { if(!message || typeof message !== 'string' || !message.trim()) throw new ArgumentError('Message cannot be empty'); })
      .then(function() {return {'from': from, 'to': to, 'message': message, _id: generateId(), time: Date.now()}; })
      .then((params) => getCollection(config.get('database:collections:messages')).insertOne(params))
      .then((res) => resolve(res.ops[0]))
      .catch(reject);
    });
  };

  this.getMessages = function(id) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!mongodb.ObjectId.isValid(id)) {
        reject(new ArgumentError("Invalid id"));
      }
      else {
        getCollection(config.get('database:collections:messages')).find({to: id}).sort({time: 1}).toArray()
        .then(resolve)
        .catch(reject);
      }
    });
  };

  this.getFriendships = function(id) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!mongodb.ObjectId.isValid(id)) {
        reject(new ArgumentError("Invalid id"));
      }
      else {
        getCollection(config.get('database:collections:friendships'))
        .find({$or: [{first: id}, {second: id}]}).toArray()
        .then(resolve)
        .catch(reject);
      }
    });
  };

  this.checkIfFriends = function(first, second) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!mongodb.ObjectId.isValid(first) || !mongodb.ObjectId.isValid(second)) {
        reject(new ArgumentError("Invalid id"));
      }
      else {
        if (first > second) first = [second, second = first][0];
        getCollection(config.get('database:collections:friendships')).findOne({'first':first, 'second': second})
        .then(function(res) {
          return res;
        })
        .then((res) => resolve(res ? true : false))
        .catch(reject);
      }
    });
  };

  this.newFriendship = function(first, second) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!mongodb.ObjectId.isValid(first) || !mongodb.ObjectId.isValid(second)) {
        reject(new ArgumentError("Invalid id"));
      }
      else if (first === second) {
        reject(new ArgumentError("Both ids cannot be the same"));
      }
      else {
        // Sort for easier storage
        if (first > second) first = [second, second = first][0];
        scope.checkIfFriends(first, second)
        .then((res) => { if (res) throw new ArgumentError("Users are already friends"); })
        .then(() => ({'first': first, 'second': second, _id: generateId()}))
        .then((params) => getCollection(config.get('database:collections:friendships')).insert(params))
        .then((res) => resolve(res.ops[0]))
        .catch(reject);
      }
    });
  };

  this.deleteMessage = function(id) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!mongodb.ObjectId.isValid(id)) reject(new ArgumentError("Invalid id"));
      else {
        getCollection(config.get('database:collections:messages'))
        .remove({_id: id})
        .then(function(res) {
          resolve(res.result.n ? true : false);
        })
        .catch(reject);
      }
    });
  };

  this.unfriend = function(first, second) {
    return Q.Promise(function(resolve, reject, notify) {
      if (!mongodb.ObjectId.isValid(first) || !mongodb.ObjectId.isValid(second)) {
        reject(new ArgumentError("Invalid id"));
      }
      else  {
        if (first > second) first = [second, second = first][0];
        getCollection(config.get('database:collections:friendships'))
        .remove({'first': first, 'second': second})
        .then(function(res) {
          resolve(res.result.n ? true : false);
        })
        .catch(reject);
      }
    });
  };
};

module.exports = DatabaseHandler;
