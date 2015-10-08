"use strict";

let config = require('./config');

let strings = require('./strings');
let clientSessions = require('client-sessions');
let Q = require('q');
let UserSecurity = require('./userSecurity');
let io = require('socket.io')(config.get('server:profileWatchPort'));

let ProfileWatcher = function(dbHandler) {
  let watchers = new Map();

  let hasAccess = function(id, requester) {
    return Q.Promise(function(resolve, reject, notify) {
      if(id === requester) resolve(true);
      else {
        dbHandler.checkIfFriends(id, requester)
        .then(resolve)
        .catch(reject);
      }
    });
  };

  let setup = function(user) {
    let previous = null; // (ab)using some closure magic
    user.socket.on('ProfileWatch', function(id) {
      if (previous !== null) {
        let watched = watchers.get(previous);
        watched.splice(watched.indexOf(user));
      }
      if (!watchers.has(id)) watchers.set(id, []);
      watchers.get(id).push(user);
    });
    user.socket.on('disconnect', function() {
      if (watchers.has(previous)) {
        let watched = watchers.get(previous);
        watched.splice(watched.indexOf(user));
      }
    });
  };

  this.notify = function(message) {
    let users = watchers.get(message.to);
    dbHandler.getUser({_id: message.to})
    .then(function(user) {
      message.username = user.username;
      users.forEach(function(user) {
        if (hasAccess(message.to, user._id)) {
          console.log('Emitting to ', user._id);
          user.socket.emit('ProfileWatch', message);
        }
      });
    });
  };

  let getUserInfo = function(cookie) {
    let matchCookie = /(?:\s|^)session=([^\s]+)/.exec(cookie);
    if (!matchCookie || matchCookie.length < 2) return null; // Session cookie not set
    return clientSessions.util.decode(UserSecurity.getSessionOptions(), matchCookie[1]).content;
  };

  io.on('connection', function(socket) {
    let info = getUserInfo(socket.handshake.headers.cookie);
    if (info !== null) {
      info.socket = socket;
      setup(info);
    }
  });
};

module.exports = ProfileWatcher;
