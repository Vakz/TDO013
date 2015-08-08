var should = require('should');
var assert = require('assert');
var superagent = require('superagent')
var httpMocks = require('node-mocks-http');

var RequestHandler = require('../lib/requestHandler.js');
var errors = require('../lib/errors.js');

var setupResponse = function(done) {
  var response = httpMocks.createResponse(
    {'eventEmitter': require('events').EventEmitter,
     'writableStream': require('stream').Writable });
  response.setEncoding('utf8');

  response.on('error', function(err) {
    throw new Error(err);
  })

  response.on('end', function(data) {
    done(response._getData())
  });
  return response;
};

describe('RequestHandler', function() {
  var requestHandler = null;
  before(function(done) {

    requestHandler = new RequestHandler('chat_test');
    requestHandler.connect(function(err, r) {
      if (err) throw new Error("Failed to initiate db connection");
      done();
    });
  });

  describe('Save', function() {

    describe('Supply no parameter', function() {
      it('should return 400', function(done) {
        var request = httpMocks.createRequest({'url': '/?msg=%20', 'query': {'msg': ' '}});

        var response = setupResponse(function(data) {
          data.should.equal('Invalid message');
          response.statusCode.should.equal(400);
          done();
        });

        requestHandler.save(request, response);
      });
    })

  });

  after(function(done) {
    requestHandler.closeDb();
    done();
  })
});
