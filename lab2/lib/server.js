// Add router to this file

require('http');
require('url');

var handlers = {
  // Returns true on success, else Error
  save: function(db, msg) {
    if (typeof msg == "string" && msg.length > 0 && msg.length < 140)
    {
      return db.save(msg);
    }
    return new Error("Invalid message");
  },

  // Returns true on success, else error
  flag: function(db, msgId) {
    var id = parseInt(msgId, 10);
    if (isNaN(id)) {
      return new Error("Invalid message id");
    }
    return db.flag(id);
  }

  getall: function(db) {
    return db.getall();
  }
};

function startServer(router, handlers, db) {
  http.createServer(function(request, response) {
    router(url.parse(request.url).pathname, router, request, response);
  }).listen(8888);
}

exports.startServer = startServer;
