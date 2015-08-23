"use strict";

var express = require('express');
var errors = require('./errors')
var DatabaseHandler = require('./databaseHandler');

var SocialServer = function(settings) {
  var app = express();
  var dbHandler = new DatabaseHandler({'address'})
  app.use(express.static('static'));

  settings = settings || {};
  settings['port'] = settings['port'] || 8888;
  settings['db'] = settings['db'] || 'social_website';

  app.get('/', function(req, res) {

  });

  this.start = function() {
    if (settings['port'] === parseInt(settings['port'], 10)) {
      app.listen(settings['port']);
    }
    else{
      throw new errors.ArgumentError("Port number not an integer");
    }

  }
}

module.exports = SocialServer;
