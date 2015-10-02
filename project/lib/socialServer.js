"use strict";

let express = require('express');
let errors = require('./errors');
let config = require('./config');
let RequestHandler = require('./requestHandler');
let clientSessions = require('client-sessions');
let UserSecurity = require('./userSecurity');
let bodyParser = require('body-parser');
let DatabaseHandler = require('./databaseHandler');

let SocialServer = function(){

  let app = express();
  let server = null;
  let dbHandler = new DatabaseHandler();
  let requestHandler = new RequestHandler(dbHandler);
  let sessionsSettings = UserSecurity.getSessionOptions();

  setupMiddleware();
  setupRoutes();

  function setupMiddleware() {
    app.use(express.static('static'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(clientSessions(sessionsSettings));
    app.use(function(req, res, next) {
      if (req.session.loggedIn) {
        dbHandler.checkToken(req.session.token, req.session._id)
        .then(function(res) {
          if (!res) req.session.reset();
        })
        .then(next());
      }
      else {
        next();
      }
    });
    app.use(function(req, res, next) {
      console.log(req.body);
      next();
    });
  }

  function setupRoutes() {
    app.get('/getUsersById', requestHandler.getUsersById);

    app.post('/register', requestHandler.register);

    app.post('/login', requestHandler.login);

    app.post('/logout', requestHandler.logout);

    app.put('/resetSessions', requestHandler.resetSessions);

    app.put('/updatePassword', requestHandler.updatePassword);

    app.get('/getProfile', requestHandler.getProfile);

    app.get('/search', requestHandler.search);

    app.post('/sendMessage', requestHandler.sendMessage);

    app.delete('/deleteMessage', requestHandler.deleteMessage);

    app.delete('/unfriend', requestHandler.unfriend);

    app.get('/checkIfFriends', requestHandler.checkIfFriends);

    app.get('/getFriends', requestHandler.getFriends);

    app.use(function(req, res) {
      res.sendStatus(404);
    });

  }

  this.start = function() {
    if (Number.isInteger(config.get('server:port'))) {
      dbHandler.connect()
      .then(function() {
        server = app.listen(config.get('server:port'));
      })
      .done();
    }
    else{
      throw new errors.ArgumentError("Port number not an integer");
    }
  };

  this.stop = function() {
    server.close();
  };
};

module.exports = SocialServer;
