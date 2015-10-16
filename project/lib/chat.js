"use strict";

let sessionSettings = require('./userSecurity').getSessionOptions();
let clientSessions = require('client-sessions');
let strings = require('./strings');
let sanitizer = require('sanitizer');
let config = require('./config');

var Chat = function(dbHandler) {
  let socketgroup = 'chatmessage';
  let io = require('socket.io')(config.get('chat:port'));
  let activeUsers = new Map();

  this.stop = function() {
    io.close();
  };

  var getUserInfo = function(cookie) {
    let matchCookie = /(?:\s|^)session=([^\s]+)/.exec(cookie);
    if (!matchCookie || matchCookie.length < 2) return null; // Session cookie not set
    return clientSessions.util.decode(sessionSettings, matchCookie[1]).content;
  };

  var systemMessage = (msg) => ({ status: 400, fromId: 'System', fromUsername: 'System', message: msg});

  var isValidMessage = (message) => message.hasOwnProperty('message') && message.hasOwnProperty('_id');

  var setupSocket = function(user) {
    user.socket.on('disconnect', function() {
      var u = activeUsers.get(user.info._id);
      if (u) {
        if(u.sockets.length === 1) activeUsers.delete(user.info._id);
        else u.sockets.splice(u.sockets.indexOf(user.socket), 1);
      }
    });

    user.socket.on(socketgroup, function(message) {
      if (!isValidMessage(message)) user.socket.emit(socketgroup, systemMessage(strings.invalidMessage));
      else (dbHandler.checkIfFriends(user.info._id, message._id))
      .then(function(areFriends) {
        if (!areFriends) user.socket.emit(socketgroup, systemMessage(strings.notFriends));
        else if (!activeUsers.has(message._id)) user.socket.emit(socketgroup, systemMessage(strings.notOnline));
        else if (user.info._id === message._id) user.socket.emit(socketgroup, systemMessage(strings.sendSelf));
        else if (message.message.length > config.get('chat:maxLength')) user.socket.emit(socketgroup, systemMessage(strings.messageTooLong));
        else {
          message.message = sanitizer.escape(message.message);
          activeUsers.get(message._id).sockets.forEach(function(socket) {
            socket.emit(socketgroup,
            { status: 200, fromId: user.info._id, fromUsername: user.info.username, toId: message._id,
              toUsername: activeUsers.get(message._id).info.username, message: message.message
            });
          });
          user.socket.emit(socketgroup,
          { status: 200, fromId: user.info._id, fromUsername: user.info.username, toId: message._id,
            toUsername: activeUsers.get(message._id).info.username, message: message.message
          });
        }
      });
    });
  };

  io.on('connection', function(socket) {
    var info = getUserInfo(socket.handshake.headers.cookie);
    if (info !== null) {
      if (!activeUsers.has(info._id)) activeUsers.set(info._id, {info: info, sockets: [socket]});
      else activeUsers.get(info._id).sockets.push(socket);
      setupSocket({info: info, socket: socket});
    }
  });
};

module.exports = Chat;
