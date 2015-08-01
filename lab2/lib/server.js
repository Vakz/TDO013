// Add router to this file

require('http');
require('url');
var MongoClient = require('MongoClient');

function startServer(router, handlers, db) {
  http.createServer(function(request, response) {
    router(url.parse(request.url).pathname, router, request, response);
  }).listen(8888);
}

exports.startServer = startServer;
