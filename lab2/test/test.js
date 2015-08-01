var should = require('should');
var assert = require('assert');

var Handler = require('../lib-coverage/handlers.js');
var errors = require('../lib-coverage/errors.js');
var MongoClient = require('mongodb').MongoClient;

describe('Handlers', function() {
  var db = null;
  var collectionName = 'test_chat';
  var collection = null;
  var handler = null;

  before('setup', function(done) {
    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, _db) {
      db = _db;
      db.dropCollection(collectionName, function(err, r) {
        collection = db.collection(collectionName);
        handler = new Handler(collection);
        done();
      });
    });
  });

  afterEach(function(done) {
    // Clear collection after each test
    collection.remove({});
    collection.count(function(err, count) {
      count.should.equal(0);
      done();
    });
  });

  describe('Save empty message', function() {
    it('should return error', function(done) {
      handler.save('', function(err, result) {

        // Should return error and database should be empty
        err.should.be.instanceof(errors.ArgumentError);
        collection.count(function(err, count) {
          count.should.equal(0);
          done();
        })
      });
    });
  });

  describe('Save short, valid, message', function() {
    it('should return true', function(done) {
      handler.save('message', function(err, result) {
        result.should.be.ok();
        collection.count(function(err, count) {
          count.should.equal(1);
          done();
        })
      });
    });
  });

  describe('Save too long message', function() {
    it('should return error', function(done) {
      handler.save(Array(142).join("a"), function(err, result) {
        err.should.be.instanceof(errors.ArgumentError);
        collection.count(function(err, count) {
          count.should.equal(0);
          done();
        })
      });
    });
  });

  describe('Save whitespace-only message', function() {
    it('should return error', function(done) {
      handler.save(' ', function(err, result) {
        err.should.be.instanceof(errors.ArgumentError);
        collection.count(function(err, count) {
          count.should.equal(0);
          done();
        });
      });
    });
  });

  describe('Save 140-character message with trailing whitespace', function() {
    it('should be trimmed and pass', function(done) {
      var msg = Array(141).join("a") + " ";
      handler.save(msg, function(err, result) {
        result.should.be.ok();
        collection.count(function(err, count) {
          count.should.equal(1);
          done();
        });
      });
    });
  });

  after(function(done) {
    db.dropCollection(collectionName, function(err, r) {
      db.close();
      done();
    });
  });
});
