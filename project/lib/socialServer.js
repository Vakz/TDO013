"use strict";

var express = require('express');
var errors = require('./errors')
var DatabaseHandler = require('./databaseHandler');
var config = require('./config');

var SocialServer = function() {
  var app = express();
  var dbHandler = new DatabaseHandler();
  app.use(express.static('static'));

  app.get('/', function(req, res) {

  });

  this.start = function() {
    if (Number.isInteger(config.get('port'))) {
      app.listen(config.get('port'));
    }
    else{
      throw new errors.ArgumentError("Port number not an integer");
    }
  };

  this.stop = function() {
    dbHandler.stop();
    app.close();
  };
};

module.exports = SocialServer;
