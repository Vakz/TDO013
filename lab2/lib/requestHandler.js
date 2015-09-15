var errors = require('./errors');
var DatabaseHandler = require('./databaseHandler');
var url = require('url');

var RequestHandler = function (collectionName) {
  var databaseHandler = null;
  var db = null;
  var mongoAdress = 'mongodb://127.0.0.1:27017/test';

  var errorHandler = function(response, err) {
    if (err instanceof errors.ArgumentError) {
      response.status(400).send(err.message);
    }
    else {
      // 503 would be more correct for database error, but is not covered
      // by lab specification
      response.status(500).send("Unknown server error");
    }
  }

  // Gets a parameter. If parameter does not exist, writes 400 to client.
  var paramHandler = function(request, response, param) {
    var paramData = url.parse(request.url, true).query[param];
    if (paramData === undefined) {
      errorHandler(response, new errors.ArgumentError(
        require('util').format('No parameter "%s"', param)
      ));
    }
    return paramData;
  }

  // Connect to the database
  this.connect = function(callback) {
    require('mongodb').MongoClient.connect(mongoAdress, function(err, _db) {
      if (err) {
        if (callback) callback(new errors.DatabaseError(err), null);
        return;
      }
      db = _db;
      databaseHandler = new DatabaseHandler(db.collection(collectionName));
      if (callback) callback(null, true);
    });
  };

  this.closeDb = function() {
    if (db) db.close();
  };

  this.save = function(request, response) {
    var msg = paramHandler(request, response, 'msg');
    if (msg === undefined) return;
    databaseHandler.save(msg, function(err, msgDbObj) {
      if (err) errorHandler(response, err);
      else response.sendStatus(200);
    });
  };

  this.flag = function(request, response) {
    var id = paramHandler(request, response, 'ID');

    if (id === undefined) return;
    databaseHandler.flag(id, function(err, successful) {
      if (err) errorHandler(response, err);
      else response.sendStatus(200);
    });
  };

  this.getall = function(request, response) {
    var messages = databaseHandler.getall(function(err, result) {
      if (err) errorHandler(response, err);
      else response.status(200).json(result);
    });
  }
};

module.exports = RequestHandler;
