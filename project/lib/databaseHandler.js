"use strict";

var errors = require('./errors.js')
var mongodb = require('mongodb');

var DatabaseHandler = function(settings) {
  var db = null;
  var connected = false;

  this.connect = function(done) {
    if (connected) {
      done(new Error("Already connected"), null);
      return;
    }
    done = done || function() {};
    mongodb.MongoClient.connect(settings['address'], function(err, _db) {
      if (err) {
        done(new errors.DatabaseError(err), null)
        return;
      }
      db = _db;
      done(null, true);
      connected = true;
    };

    this.close = function() {
      if (db) db.close();
      connected = false;
    };
  }
}
