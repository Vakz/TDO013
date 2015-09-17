"use strict";

var config = require('./config');
var crypto = require('crypto');
var errors = require('./errors');
var Q = require('q');
var UserSecurity = function() {

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
    var promise = Q.nfcall(crypto.randomBytes, length);
    // This will in fact generate a string longer than length, so cut off the rest
    promise.then((bytes) => resolve(bytes.toString('hex').substring(0,length)), reject);
  });
};

module.exports = UserSecurity;
