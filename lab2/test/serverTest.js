var should = require('should');
var request = require('superagent');
var assert = require('assert');

var Server = require('../lib/server.js');

describe('Server', function() {
  var server = new Server('chat_test');
  server.start();

  describe('Nothing', function() {
    it('should do nothing', function(done) {
      done();
    })
  })

  after(function(done) {
    server.stop();
    done();
  })
});
