var should = require('should');
var request = require('superagent');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;

var Server = require('../lib/server.js');

var port = 8888;
var endpoint = 'http://localhost:' + port;

/*
  This test makes some assumptions.
  Each function [save, flag, getall] is tested with only valid paramaters.
  Invalid paramaters are assumed to be tested in requestHandler. This is really
  just to cut down on test code.
*/
describe('Server', function() {
  var server = null;
  var collection = null;
  var db = null;

  var cleanDb = function(done) {
    // Clear collection after each test

    collection.remove({});
    collection.count(function(err, count) {
      count.should.equal(0);
      done();
    });
  };

  before(function(done) {
    server = new Server('chat_test');
    server.start();

    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
      if (err) throw new Error(err);
      collection = db.collection('chat_test');
      done();
    });
  })

  describe('Functions', function() {
    describe('Save valid message', function() {
      it('should return 200 OK', function(done) {
        request(endpoint + "/save?msg=test").end(function(err, res) {
          res.status.should.equal(200);
          collection.count(function(err, count) {
            count.should.equal(1);
            done();
          });
        });
        after(cleanDb);
      });
    });

    describe('Flag valid message', function() {
      var msgId = null;
      before('save a message to flag', function(done) {
        collection.insertOne({'message': 'a', 'flag': false}, function(err, result) {
          msgId = result.ops[0]["_id"].toString();
          result.insertedCount.should.equal(1);
          done();
        });
      });

      it('should return 200 OK', function(done) {
        request(endpoint + '/flag?ID=' + msgId).end(function(err, res) {
          res.status.should.equal(200);
          collection.find().toArray(function(docs) {
            docs[1]['flag'].should.be.ok();
          });
          done();
        })
      });

      after(cleanDb);
    });

    describe('Get two messages', function() {
      before('save messages to flag', function(done) {
        collection.insertMany([{'message': "message1"}, {'message': "message2"}]
          , function(err, result) {
            result.insertedCount.should.equal(2);
            done();
        });
      });

      it('should return two messages with appropriate content type', function(done) {
        request(endpoint + '/getall').end(function(err, res) {
          res.status.should.equal(200);
          res.type.should.equal('application/json');
          ;
          var messages = JSON.parse(res.text).map(function(i) {
            return i['message'];
          });
          messages.length.should.equal(2);
          messages.should.eql(['message1', 'message2']);
          done();
        });
      });

      after(cleanDb);
    });

    describe('Make POST request', function() {
      it('should return 405', function(done) {
        request.post(endpoint).end(function(err, res) {
          res.status.should.equal(405);
          done();
        });
      });
    });

    describe('Get invalid function', function() {
      it('should return 404', function(done) {
        request(endpoint + '/invalid').end(function(err, res) {
          res.status.should.equal(404);
          done();
        });
      });
    });
  });

  after(function(done) {
    server.stop();
    done();
  })
});
