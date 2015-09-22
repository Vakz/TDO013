"use strict";

var express = require('express');
var errors = require('./errors');
var config = require('./config');
var RequestHandler = require('./requestHandler');
var clientSessions = require('client-sessions');
var UserSecurity = require('./userSecurity');
var bodyParser = require('body-parser');

var SocialServer = function(){

  var app = express();
  var requestHandler = new RequestHandler();
  var sessionsSettings = UserSecurity.getSessionOptions();

  setupMiddleware();
  setupRoutes();

  function setupMiddleware() {
    app.use(express.static('static'));
    app.use(bodyParser.json());
    app.use(clientSessions(sessionsSettings));
    app.use(function(req, res, next) {
      if (req.session.loggedIn) {
        requestHandler.checkToken(req.session.token, req.session._id)
        .then(function(res) {
          if (!res) req.session.reset();
        })
        .then(next);
      }
    });
  }

  function setupRoutes() {
    app.get('/getUsersById', requestHandler.getUsersById);

    app.all('*', function(req, res) {
      res.sendStatus(404);
    });
  }

  this.start = function() {
    if (Number.isInteger(config.get('server:port'))) {
      requestHandler.connect()
      .then(() => app.listen(config.get('server:port')));
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
