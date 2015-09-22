process.env.NODE_ENV = 'test';

var ArgumentError = require('./errors').ArgumentError;
var DatabaseError = require('./errors').DatabaseError;
var SemanticsError = require('./errors').SemanticsError;
var DatabaseHandler = require('./databaseHandler');
var UserSecurity = require('./userSecurity');

var config = require('./config');
var Q = require('q');

var errorHandler = function(response, err) {
  if (err instanceof ArgumentError) {
    response.status(400).send(err.message);
  }
  else if (err instanceof SemanticsError) {
    response.status(422).send(err.message);
  }
  else if (err instanceof DatabaseError) {
    response.status(503).send(err.message);
  }
  else {
    response.status(500).send(err.message);
  }
};

var RequestHandler = function() {
  dbHandler = new DatabaseHandler();
  scope = this;

  this.connect = function() {
    return dbHandler.connect();
  };

  this.close = function() {
    dbHandler.close();
  };

  this.checkToken = function(token, id) {
    return Q.Promise(function(resolve, reject, notify) {
      dbHandler.getUser({_id: id})
      .then((user) => resolve(user.token === token, reject));
    });
  };

  this.getUsersById = function(req, res) {
    if (!req.query.ids) errorHandler(res, new ArgumentError("No paramater 'ids'"));
    else {
      var ids = JSON.parse(req.query.ids);
      if(!Array.isArray(ids)) errorHandler(res, new ArgumentError("Invalid ids"));
      else {
        dbHandler.getManyById(ids)
        .then((users) => res.status(200).json(
            users.map((user) => ({ _id: user._id, username: user.username}))),
          (err) => errorHandler(res, err));
      }
    }
  };

  this.register = function(req, res) {
    if (req.session.loggedIn) errorHandler(res, new ArgumentError("User already logged in"));
    else if (!req.body.username || !req.body.password) errorHandler(res, new ArgumentError("Missing parameters"));
    else if(req.body.password.length < config.get('security:passwords:minLength'))
    errorHandler(res, new ArgumentError("Password too short"));
    else {
      UserSecurity.hash(req.body.password)
      .then((hash) => ({username: req.body.username, password: hash}))
      .then((params) => dbHandler.registerUser(params))
      .then(function(user) {
        scope.login(req, res);
      })
      .catch((err) => errorHandler(res, err));
    }
  };

  this.login = function(req, res) {
    if (req.session.loggedIn) errorHandler(res, new ArgumentError("User already logged in"));
    else if (!req.body.username || !req.body.password) errorHandler(res, new ArgumentError("Missing parameters"));
    else {
      var user = null;
      dbHandler.getUser({username: req.body.username})
      .then((_user) => user = _user)
      .then(() => { if (!user) errorHandler(res, new SemanticsError("User does not exist")); })
      .then(() => UserSecurity.verifyHash(req.body.password, user.password))
      .then((res) => { if (!res) throw new SemanticsError("Incorrect password"); })
      .then(function() {
        req.session._id = user._id;
        req.session.username = user.username;
        req.session.token = user.token;
        req.session.loggedIn = true;
        res.status(200).json({username: user.username, _id: user._id});
      })
      .catch((err) => errorHandler(res, err));
    }
  };

  this.logout = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new ArgumentError("User not logged in"));
    else {
      req.session.reset();
      res.sendStatus(200);
    }
  };

  this.resetSessions = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new ArgumentError("User not logged in"));
    else {
      dbHandler.updateToken(req.session._id)
      .then(() => scope.logout(req, res))
      .catch((err) => errorHandler(res, err));
    }
  };
};

module.exports = RequestHandler;
/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') {
  module.exports._private = { errorHandler: errorHandler };
}
