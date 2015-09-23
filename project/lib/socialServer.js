"use strict";

let express = require('express');
let errors = require('./errors');
let config = require('./config');
let RequestHandler = require('./requestHandler');
let clientSessions = require('client-sessions');
let UserSecurity = require('./userSecurity');
let bodyParser = require('body-parser');

let SocialServer = function(){

  let app = express();
  let requestHandler = new RequestHandler();
  let sessionsSettings = UserSecurity.getSessionOptions();

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
