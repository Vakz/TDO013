"use strict";

let config = require('./config');
let bcrypt = require('bcrypt');
let errors = require('./errors');
let Q = require('q');
let RandExp = require('randexp');
let UserSecurity = {

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
    else {
      let pattern = new RegExp("^[" + config.get('security:sessions:tokenChars') + "]{" + length + "}$");
      resolve(new RandExp(pattern).gen());
    }
  });
};

UserSecurity.hash = function(str) {
  return Q.Promise(function(resolve, reject, notify) {
    if (str.length < 1) reject(new errors.ArgumentError("Invalid password"));
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

UserSecurity.isValidUsername = function(username) {
  if (username.length < 1 || username.length > config.get('users:usernameMaxLength')) return false;
  let pattern = new RegExp("^[" + config.get('users:acceptableCharacters') + "]+$");
  return pattern.test(username);
};

module.exports = UserSecurity;
