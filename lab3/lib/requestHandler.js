var errors = require('./errors');
var DatabaseHandler = require('./databaseHandler');
var url = require('url');

var RequestHandler = function (collectionName) {
  var databaseHandler = null;
  var db = null;
  var mongoAdress = 'mongodb://127.0.0.1:27017/test';

  var createHeaders = function(contentType) {
    var headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
    };
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
  }


  var errorHandler = function(response, err) {
    if (err instanceof errors.ArgumentError) {

      response.writeHead(400, createHeaders('text/html'));
      response.write(err.message);
      response.end();
    }
    else {
      // 503 would be more correct for database error, but is not covered
      // by lab specification
      response.writeHead(500, createHeaders('text/plain'));
      response.write("Unknown server error");
      response.end();
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
  this.connect = function(done) {
    done = done || function() {};
    require('mongodb').MongoClient.connect(mongoAdress, function(err, _db) {
      if (err) {
        done(new errors.DatabaseError(err), null);
      }
      else {
        db = _db;
        databaseHandler = new DatabaseHandler(db.collection(collectionName));
        done(null, true);
      }
    });
  };

  this.closeDb = function() {
    if (db) db.close();
  };

  this.save = function(request, response) {
    var msg = paramHandler(request, response, 'msg');
    if (msg === undefined) {
      return;
    }
    else {
      databaseHandler.save(msg, function(err, msgDbObj) {
        if (err) {
          errorHandler(response, err);
        }
        else {

          response.writeHead(200, createHeaders('application/json'));
          response.write(JSON.stringify([{'id': msgDbObj._id}]));
          response.end();
        }
      });
    }
  }

  this.flag = function(request, response) {
    var id = paramHandler(request, response, 'ID');

    if (id === undefined) {
      return;
    }
    else {
      databaseHandler.flag(id, function(err, successful) {
        if (err) {
          errorHandler(response, err);
        }
        else {
          response.writeHead(200, createHeaders('text/html'));
          response.end();
        }
      });
    }
  }

  this.getall = function(request, response) {
    var messages = databaseHandler.getall(function(err, result) {
      if (err) {
        errorHandler(response, err);
      }
      else {
        response.writeHead(200, createHeaders('application/json'));
        response.write(JSON.stringify(result));
        response.end();
      }
    });
  }
};

module.exports = RequestHandler;
