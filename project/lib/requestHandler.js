"use strict";

process.env.NODE_ENV = 'test';

let ArgumentError = require('./errors').ArgumentError;
let DatabaseError = require('./errors').DatabaseError;
let SemanticsError = require('./errors').SemanticsError;
let AuthenticationError = require('./errors').AuthenticationError;

let strings = require('./strings');
let UserSecurity = require('./userSecurity');
let config = require('./config');
let ProfileWatcher = require('./profileWatcher');

let Q = require('q');
let sanitizer = require('sanitizer');

let errorHandler = function(response, err) {
  if (err instanceof ArgumentError) {
    response.status(400).send(err.message);
  }
  else if (err instanceof SemanticsError) {
    response.status(422).send(err.message);
  }
  else if (err instanceof AuthenticationError) {
    /*
      401 would be more appropriate here, but due to the constraint of having
      to include a WWW-authenticate header, and me not wanting to implement
      basic HTTP authentication, 403 will have to do.
    */
    response.status(403).send(err.message);
  }
  else if (err instanceof DatabaseError) {
    response.status(503).send(err.message);
  }
  else {
    console.error(err.stack);
    response.status(500).send(err.message);
  }
};

let RequestHandler = function(dbHandler) {

  let scope = this;
  let profileWatcher = new ProfileWatcher(dbHandler);

  this.close = function() {
    profileWatcher.stop();
  };

  let hasAccess = function(id, req) {
    return Q.Promise(function(resolve, reject, notify) {
      if(id === req.session._id) resolve(true);
      else {
        dbHandler.checkIfFriends(id, req.session._id)
        .then(resolve)
        .catch(reject);
      }
    });
  };

  var cleanConfidential = (users) => users.map((user) => ({ _id: user._id, username: user.username}));

  this.getUsersById = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.query.ids) errorHandler(res, new ArgumentError(strings.noParamIds));
    else {
      let ids = JSON.parse(req.query.ids);
      if(!Array.isArray(ids)) errorHandler(res, new ArgumentError(strings.invalidIds));
      else {
        dbHandler.getManyById(ids)
        .then((users) => res.status(200).json(cleanConfidential(users)),
          (err) => errorHandler(res, err));
      }
    }
  };

  this.register = function(req, res) {
    if (req.session.loggedIn) errorHandler(res, new ArgumentError(strings.alreadyLoggedIn));
    else if (!req.body.username || !req.body.password) errorHandler(res, new ArgumentError(strings.missingParams));
    else if(req.body.password.length < config.get('security:passwords:minLength'))
      errorHandler(res, new ArgumentError(strings.passwordTooShort));
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
    if (req.session.loggedIn) errorHandler(res, new ArgumentError(strings.alreadyLoggedIn));
    else if (!req.body.username || !req.body.password) errorHandler(res, new ArgumentError(strings.missingParams));
    else {
      let user = null;
      dbHandler.getUser({username: req.body.username})
      .then((_user) => user = _user)
      .then(() => { if (!user) throw new SemanticsError(strings.noUser); })
      .then(() => UserSecurity.verifyHash(req.body.password, user.password))
      .then((res) => { if (!res) throw new SemanticsError(strings.passwordIncorrect); })
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
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else {
      req.session.reset();
      res.sendStatus(204);
    }
  };

  this.resetSessions = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else {
      dbHandler.updateToken(req.session._id)
      .then(() => scope.logout(req, res))
      .catch((err) => errorHandler(res, err));
    }
  };

  this.updatePassword = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.body.password) errorHandler(res, new ArgumentError(strings.noParamPassword));
    else if(req.body.password.length < config.get('security:passwords:minLength'))
      errorHandler(res, new ArgumentError(strings.passwordTooShort));
    else {
      let reset = req.body.reset ? true : false;
      UserSecurity.hash(req.body.password)
      .then(function(pw) {
        dbHandler.updatePassword(req.session._id, pw, reset)
        .then(() => res.sendStatus(204))
        .done();
      });
    }
  };

  this.getProfile = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.query.id) errorHandler(res, new ArgumentError(strings.noParamId));
    else {
      hasAccess(req.query.id, req)
      .then((res) => { if (!res) throw new ArgumentError(strings.noAccess); })
      .then(() => dbHandler.getUser({_id: req.query.id}))
      .then(function(user) {
        return Q.Promise(function(resolve, reject) {
          let params = {_id: user._id, username: user.username };
          dbHandler.getMessages(user._id)
          .then((messages) => params.messages = messages)
          .then(() => resolve(params), reject);
        });
      })
      .then((result) => res.status(200).json(result))
      .catch((err) => errorHandler(res, err))
      .done();
    }
  };

  this.getMessages = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.query.id) errorHandler(res, new ArgumentError(strings.noParamId));
    else {
      hasAccess(req.query.id, req)
      .then((res) => { if (!res) throw new ArgumentError(strings.noAccess); })
      .then(() => dbHandler.getMessages(req.query.id, req.query.after ? Number.parseInt(req.query.after) : 0))
      .then((result) => res.status(200).json(result))
      .catch((err) => errorHandler(res, err))
      .done();
    }
  };

  this.search = function(req, res) {
    if(!req.session.loggedIn) errorHandler(res, new AuthenticationError("User not logged in"));
    else if(!req.query.searchword) errorHandler(res, new ArgumentError("Missing parameter 'searchword'"));
    else {
      dbHandler.searchUsers(req.query.searchword)
      .then(function(result) {
        return result.map((user) => ({_id: user._id, username: user.username}));
      })
      .then((users) => res.status(200).json(users))
      .catch((err) => errorHandler(res, err))
      .done();
    }
  };

  this.sendMessage = function(req, res) {
    if(!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if(!req.body.receiver) errorHandler(res, new ArgumentError(strings.noParamReceiver));
    else if(!req.body.message) errorHandler(res, new ArgumentError(strings.noParamMessage));
    else if(req.body.message.length > config.get('messages:maxLength')) errorHandler(res, new SemanticsError(strings.messageTooLong));
    else {
      let msg = sanitizer.escape(req.body.message);
      hasAccess(req.body.receiver, req)
      .then((res) => { if (!res) throw new ArgumentError(strings.noAccess); })
      .then(() => dbHandler.newMessage(req.session._id, req.body.receiver, msg))
      .then(function(msg) {
        profileWatcher.notify(msg);
        return msg;
      })
      .then((msg) => res.status(200).json(msg))
      .catch((err) => errorHandler(res, err))
      .done();
    }
  };

  this.deleteMessage = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.body.messageId) errorHandler(res, new ArgumentError(strings.noParamMessageId));
    else {
      dbHandler.getMessage(req.body.messageId)
      .then(function(msg) {
        // Make sure message exists and user is allowed to delete it
        if (!msg) throw new ArgumentError(strings.noMessage);
        if (msg.to !== req.session._id) throw new ArgumentError(strings.notOwnedMessage);
        return msg;
      })
      .then((msg) => dbHandler.deleteMessage(msg._id))
      .then(() => res.sendStatus(204))
      .catch((err) => errorHandler(res, err));
    }
  };

  this.addFriend = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.body.friendId) errorHandler(res, new ArgumentError(strings.noParamFriendId));
    else {
      dbHandler.newFriendship(req.session._id, req.body.friendId)
      .then(() => res.sendStatus(204))
      .catch((err) => errorHandler(res, err));
    }
  };

  this.unfriend = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.body.friendId) errorHandler(res, new ArgumentError(strings.noParamFriendId));
    else {
      dbHandler.unfriend(req.session._id, req.body.friendId)
      .then(function(removed) {
        if (!removed) throw new ArgumentError(strings.notFriends);
        else {
          res.sendStatus(204);
        }
      })
      .catch((err) => errorHandler(res, err));
    }
  };

  this.checkIfFriends = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else if (!req.query.friendId) errorHandler(res, new ArgumentError(strings.noParamFriendId));
    else {
      dbHandler.checkIfFriends(req.session._id, req.query.friendId)
      .then((result) => res.status(200).json({friends: result}))
      .catch((err) => errorHandler(res, err));
    }
  };

  this.getFriends = function(req, res) {
    if (!req.session.loggedIn) errorHandler(res, new AuthenticationError(strings.notLoggedIn));
    else {
      dbHandler.getFriendships(req.session._id)
      .then(function(friends) {
        return friends.map((rel) => req.session._id === rel.first ? rel.second : rel.first);
      })
      .then((ids) => dbHandler.getManyById(ids))
      .then((friends) => res.status(200).json(cleanConfidential(friends)))
      .catch((err) => errorHandler(res, err));
    }
  };

  
};

module.exports = RequestHandler;
/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') {
  module.exports._private = { errorHandler: errorHandler };
}
