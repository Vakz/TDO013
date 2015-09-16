"use strict";

var config = require('./config');

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

module.exports = UserSecurity;
