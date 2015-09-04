// Add router to this file

var RequestHandler = require('./requestHandler');

var Server = function(collectionName) {

  collectionName = collectionName || 'chat';
  var requestHandler = new RequestHandler(collectionName);

  var app = (require('express'))();

  app.get('/flag', requestHandler.flag);

  app.get('/save', requestHandler.save);

  app.get('/getall', requestHandler.getall);

  app.get('*', function(req, res) {
    res.sendStatus(404);
  })

  app.post('/', function(req, res) {
    res.sendStatus(405);
  })

  // Start accepting connections and connect to database
  this.start = function() {
    app.listen(8888);
    requestHandler.connect();
  }

  // Stop all incoming connections and close db
  this.stop = function() {
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
