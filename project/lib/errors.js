"use strict";

let util = require('util');

function ArgumentError(message) {
  this.message = message;
}
util.inherits(ArgumentError, Error);

function DatabaseError(message) {
  this.message = message;
}
util.inherits(DatabaseError, Error);

function SemanticsError(message) {
  this.message = message;
}
util.inherits(SemanticsError, Error);

function AuthenticationError(message) {
  this.message = message;
}
util.inherits(AuthenticationError, Error);

exports.AuthenticationError = AuthenticationError;
exports.ArgumentError = ArgumentError;
exports.DatabaseError = DatabaseError;
exports.SemanticsError = SemanticsError;
