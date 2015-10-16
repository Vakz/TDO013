importScripts('/bower_components/socket.io-client/socket.io.js');
var socket = io(':45557');
onmessage = function(event) {
  if (event.data.type === 'set') socket.emit('ProfileWatch', event.data.id);
};

socket.on('ProfileWatch', (message) => postMessage(message));
