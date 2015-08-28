// Add router to this file

var RequestHandler = require('./requestHandler');

var Server = function(collectionName) {

  collectionName = collectionName || 'chat';
  var requestHandler = new RequestHandler(collectionName);
  var outer = this;
  var connections = [];

  var app = (require('express'))();

  app.on('connection', function(socket) {
    connections[connections.length] = socket;
    socket.on('close', function() {
      connections.splice(connections.indexOf(socket), 1);
    });
  });

  app.get('/flag', function(req, res) {
    requestHandler.flag(req, res);
  });

  app.get('/save', function(req, res) {
    requestHandler.save(req, res);
  });

  app.get('/getall', function(req, res) {
    requestHandler.getall(req, res);
  })

  app.get('*', function(req, res) {
    res.sendStatus(404);
  })

  app.post('/', function(req, res) {
    res.sendStatus(405)
  })

  // Start accepting connections and connect to database
  this.start = function() {
    app.listen(8888);
    requestHandler.connect();
  }

  // Stop all incoming connections and close db
  this.stop = function() {
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
