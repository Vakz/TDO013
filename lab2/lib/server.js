// Add router to this file

var http = require('http');
var url = require('url');
var RequestHandler = require('./requestHandler');

var Server = function(collectionName) {
  collectionName = collectionName || 'chat';
  var requestHandler = new RequestHandler(collectionName);
  var outer = this;
  var connections = [];
  var internalServer = http.createServer(function(request, response) {
    outer.route(request, response);
  });
  internalServer.on('connection', function(socket) {
    connections[connections.length] = socket;
    socket.on('close', function() {
      connections.splice(connections.indexOf(socket), 1);
    });
  })


  this.route = function(request, response) {
    var urlParts = url.parse(request.url);
    var path = urlParts.pathname.substring(1);

    if (request.method == 'POST') {
      response.writeHead(405, {'Content-Type': 'text/html'});
      response.write("Wrong method, POST not allowed");
      response.end();
    }
    else if (path !== '' && typeof requestHandler[path] === 'function') {
      requestHandler[path](request, response);
    }
    else {
      response.writeHead(404, {'Content-Type': 'text/html'});
      response.write("404 Not Found");
      response.end();
    }
  }

  // Start accepting connections and connect to database
  this.start = function() {
    internalServer.listen(8888);
    requestHandler.connect();
  }

  // Stop all incoming connections and close db
  this.stop = function() {
    internalServer.close();
    connections.forEach(function(socket) {
      socket.destroy();
    });
    requestHandler.closeDb();
  }
}

// If this is the main file, start server. Else export module.
if (require.main === module) {
  var server = new Server();
  server.start();
}
else {
  module.exports = Server;
}
