"use strict";

var config = require('./config');
var bcrypt = require('bcrypt');
var errors = require('./errors');
var Q = require('q');
var UserSecurity = {

};

UserSecurity.getSessionOptions = function() {
  return {
    cookieName: 'session',
    secret: config.get("security:sessions:key"),
    duration: config.get("security:sessions:sessionDuration"),
    activeDuration: config.get("security:sessions:activeDuration")
  };
};

UserSecurity.generateToken = function(length) {
  return Q.Promise(function(resolve, reject, notify) {
    if (length < 1) reject(new errors.ArgumentError("Token length must be at least 1"));
    else if (length > 20) reject(new errors.ArgumentError("Cannot generate token longer than 20 characters"));
    else {
      var promise = Q.ninvoke(bcrypt, "genSalt");
      // This will in fact generate a string longer than length, so cut off the rest
      promise.then((salt) => resolve(salt.slice(salt.length - length)), reject);
    }
  });
};

UserSecurity.hash = function(str) {
  return Q.Promise(function(resolve, reject, notify) {
    if (str.length < 1) reject(new errors.ArgumentError("Cannot hash zero-length string"));
    else {
      Q.ninvoke(bcrypt, "hash", str, config.get('security:passwords:saltRounds'))
      .then(resolve, reject);
    }
  });
};

UserSecurity.verifyHash = function(str, hash) {
  return Q.Promise(function(resolve, reject, notify) {
    if (str.length < 1) reject(new errors.ArgumentError("Cannot check zero-length string"));
    else {
      Q.ninvoke(bcrypt, "compare", str, hash)
      .then(resolve, reject);
    }
  });
};

module.exports = UserSecurity;
