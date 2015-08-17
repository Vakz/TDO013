// Add router to this file

var http = require('http');
var url = require('url');
var RequestHandler = require('./requestHandler');

var Server = function(collectionName) {
  var requestHandler = new RequestHandler(collectionName);
  requestHandler.connect();
  var outer = this;

  this.route = function(request, response) {
    var urlParts = url.parse(request.url);
    var path = urlParts.pathname.substring(1);
    console.log("About to route a request for " + path);

    if (request.method == 'POST') {
      response.writeHead(405, {'Content-Type': 'text/html'});
      response.write("Wrong method, POST not allowed");
    }
    if (path !== '' && typeof requestHandler[path] === 'function') {
      requestHandler[path](request, response);
    }
    else {
      response.writeHead(404, {'Content-Type': 'text/html'});
      response.write("404 Not Found");
      response.end();
    }
  }

  this.start = function() {
    http.createServer(function(request, response) {
      outer.route(request, response);
    }).listen(8888);
  }
}

// If this is the main file, start server. Else export module.
if (require.main === module) {
  var server = new Server('chat');
  server.start();
}
else {
  module.exports = Server;
}
