// Add router to this file

var http = require('http');
var url = require('url');
var RequestHandler = require('./requestHandler');

var Server = function(collectionName) {
  collectionName = collectionName || 'chat';
  var requestHandler = new RequestHandler(collectionName);
  requestHandler.connect();
  var outer = this;
  var internalServer = http.createServer(function(request, response) {
    outer.route(request, response);
  });

  this.route = function(request, response) {
    var urlParts = url.parse(request.url);
    var path = urlParts.pathname.substring(1);
    console.log("About to route a request for " + path);

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

  this.start = function() {
    console.log("Starting server, now accepting connections..")
    internalServer.listen(8888);
  }
    internalServer.close(function(err, r) {
      console.log("Stopping server..");
    });
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
