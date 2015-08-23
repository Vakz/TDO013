"use strict";

var util = require('util');

function ArgumentError(message) {
  this.message = message;
}

util.inherits(ArgumentError, Error);

function DatabaseError(message) {
  this.messase = message;
}

util.inherits(DatabaseError, Error);

exports.ArgumentError = ArgumentError;
exports.DatabaseError = DatabaseError;
