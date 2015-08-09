var should = require('should');
var assert = require('assert');
var superagent = require('superagent')
var httpMocks = require('node-mocks-http');
var MongoClient = require('mongodb').MongoClient;

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
  var collection = null;



  var cleanDb = function(done) {
    // Clear collection after each test

    collection.remove({});
    collection.count(function(err, count) {
      count.should.equal(0);
      done();
    });
  };

  before(function(done) {
    var setupCount = 0;
    var steps = 2;

    requestHandler = new RequestHandler('chat_test');
    requestHandler.connect(function(err, r) {
      if (err) throw new Error("Failed to initiate db connection");
      setupCount++;
      if (setupCount == steps) done();
    });

    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
      if (err) throw new Error(err);
      collection = db.collection('chat_test');
      setupCount++;
      if (setupCount == steps) done();
    });
  });

  describe('Save', function() {

    describe('Supply no parameter', function() {
      it('should return 400', function(done) {
        var request = httpMocks.createRequest();

        var response = setupResponse(function(data) {
          data.should.equal('No parameter "msg"');
          response.statusCode.should.equal(400);
          done();
        });

        requestHandler.save(request, response);
      });
    });

    describe('Supply empty parameter', function() {
      it('should return 400', function(done) {
        var request = httpMocks.createRequest({'url': '/?msg='});

        var response = setupResponse(function(data) {
          data.should.equal('Invalid message');
          response.statusCode.should.equal(400);
          done();
        });

        requestHandler.save(request, response);
      });
    });

    describe('Save valid parameter', function() {
      it('should return 200 OK', function(done) {
        var request = httpMocks.createRequest({'url': '?msg=message'});

        var response = setupResponse(function(data) {
          response.statusCode.should.equal(200);
          collection.count(function(err, count) {
            count.should.equal(1);
            done();
          });
        });

        requestHandler.save(request, response);
      });

      after(cleanDb);
    });

    describe('Save too long parameter', function() {
      it('should return 400', function(done) {
        var request = httpMocks.createRequest(
          {'url': '?msg=' + Array(142).join("a")});

          var response = setupResponse(function(data) {
            response.statusCode.should.equal(400);
            done();
          });

          requestHandler.save(request, response);
      })
    })
  });

  describe.skip('Flag', function() {
    describe('Flag non-existant message with valid id', function() {
      it('should return 400 with appropriate message', function(done) {
        var request = httpMocks.createRequest(
          {'url': '?flag=123456789012123456789012'});

          var response = setupResponse(function(data) {
            response.statusCode.should.equal(400);
            data.should.equal("No message with id 123456789012123456789012");
            done();
          });

          requestHandler.flag(request, response);
      });
    });

    describe('Flag invalid id', function() {
      it('should return 400 with appropriate message', function(done) {
        var request = httpMocks.createRequest();

        var response = setupResponse(function(data) {
          response.statusCode.should.equal(400);
          data.should.equal("Invalid id");
          done();
        });
      });
    });

    describe('Flag existing message', function() {
      var msgId = null;
      before('save a message to flag', function(done) {
        handler.save("a", function(err, result) {
          msgId = result["_id"].toString();
          collection.count(function(err, count) {
            count.should.equal(1);
            done();
          })
        });
      });

      it('should return 200 OK', function() {
        var request = httpMocks.createRequest({'url': '?ID=' + msgId});

        var response = setupResponse(function(data) {
          response.statusCode.should.equal(200);

          collection.find().toArray(function(err, docs) {
            docs[0]['flag'].should.be.ok();
            done();
          });
        })
      });
    });
  });

  after(function(done) {
    requestHandler.closeDb();
    done();
  })
});
