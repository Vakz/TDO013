var ArgumentError = require('./errors').ArgumentError;
var DatabaseError = require('./errors').DatabaseError;
var DatabaseHandler = require('./databaseHandler');

var Q = require('q');

var RequestHandler = function() {
  dbHandler = new DatabaseHandler();

  var errorHandler = function(response, err) {
    if (err instanceof ArgumentError) {
      response.status(400).send(err.message);
    }
    else if (err instanceof DatabaseError) {
      response.status(503).send("Unexpected database error");
    }
    else {
      response.status(500).send("Unknown server error");
    }
  };

  this.connect = function() {
    return dbHandler.connect();
  };

  this.close = function() {
    dbHandler.close();
  };

  this.getUsersById = function(req, res) {
    console.log(req.query.ids)
    if (!req.query.ids) {
      errorHandler(res, new ArgumentError("No paramater 'ids'"))
    }
    else {
      var ids = JSON.parse(req.query.ids)
      if(!Array.isArray(ids)) {
        errorHandler(res, new ArgumentError("Invalid ids"));
      }
      else {
        dbHandler.getManyById(ids)
        .then(function(users) {
          var reply = {};
          users.forEach(function(user) {
            reply[user._id] = user.username;
          });
          res.status(200).json(reply);
        },
        (err) => errorHandler(res, err));
      }
    }
  };
}

module.exports = RequestHandler;
