"use strict";

var express = require('express');
var errors = require('./errors');
var config = require('./config');
var clientSessions = require('client-sessions');
var UserSecurity = require('./userSecurity');

var SocialServer = function(){

  var app = express();

  var sessionsSettings = UserSecurity.getSessionOptions();

  setupMiddleware();
  setupRoutes();

  function setupMiddleware() {
    app.use(express.static('static'));
    app.use(clientSessions(sessionsSettings));
  }

  function setupRoutes() {
    app.get('/asd', function(req, res) {
      res.send("No cookie");
    });
  }

  this.start = function() {
    if (Number.isInteger(config.get('port'))) {
      app.listen(config.get('port'));
    }
    else{
      throw new errors.ArgumentError("Port number not an integer");
    }
  };

  this.stop = function() {
    app.close();
  };
};

module.exports = SocialServer;
