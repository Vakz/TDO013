var should = require('should');
var assert = require('assert');

var index = require('../lib-coverage/handlers.js');

describe('Handlers', function() {
  var db = require('./helpers/mock_db.js');

  describe('Save empty message', function() {
    it('should return error', function(done) {
      index.save(db, '').should.be.Error;
      done();
    })
  });
});
