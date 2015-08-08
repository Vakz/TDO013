var should = require('should');
var assert = require('assert');

var DatabaseHandler = require('../lib/databaseHandler.js');
var errors = require('../lib/errors.js');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

describe('DatabaseHandler', function() {
  var db = null;
  var collectionName = 'test_chat';
  var collection = null;
  var handler = null;

  var cleanDb = function(done) {
    // Clear collection after each test

    collection.remove({});
    collection.count(function(err, count) {
      count.should.equal(0);
      done();
    });
  };

  before('setup', function(done) {
    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, _db) {
      db = _db;
      db.dropCollection(collectionName, function(err, r) {
        collection = db.collection(collectionName);
        handler = new DatabaseHandler(collection);
        done();
      });
    });
  });

  describe('Save', function() {
    afterEach(cleanDb);

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
  });

  describe('Flag', function() {

    afterEach(cleanDb);

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

      it('should return true', function(done) {
        handler.flag(msgId, function(err, r) {
          r.should.be.ok();
          collection.find().toArray(function(err, docs) {
            docs[0]['flag'].should.be.ok();
            done();
          });
        });
      });
    });

    describe('Flag invalid id', function() {
      it('should return an error', function(done) {
        handler.flag('a', function(err, r) {
          err.should.be.instanceof(errors.ArgumentError);
          collection.count(function(err, count) {
            count.should.equal(0);
            done();
          })
        })
      });
    });

    describe('Flag non-existant message', function() {
      it('should return an error', function(done) {
        handler.flag('123456789012123456789012', function(err, r) {
          err.should.be.instanceof(errors.ArgumentError);
          collection.count(function(err, count) {
            count.should.equal(0);
            done();
          });
        });
      });
    });
  });

  describe('Getall', function() {

    afterEach(cleanDb);

    describe('Get message', function() {
      before('save a message to later get', function(done) {
        handler.save('a message', function(err, r) {
          collection.count(function(err, count) {
            count.should.equal(1);
            done();
          });
        });
      });

      it('should return exactly one message', function(done) {
        handler.getall(function(err, result) {
          result.length.should.equal(1);
          result[0]['message'].should.equal('a message');
          done();
        });
      });
    });

    describe('Get several messages', function() {
      before('save three messages to later get', function(done) {
        handler.save('message 1', function(err, r) {
          handler.save('message 2', function(err, r) {
            handler.save('message 3', function(err, r) {
              collection.count(function(err, count) {
                count.should.equal(3);
                done();
              });
            });
          });
        });
      });

      it('should return exactly three messages', function(done) {
        handler.getall(function(err, result) {
          result.length.should.equal(3);
          result = result.map(function(i) { return i['message']; });
          result.should.eql(['message 1', 'message 2', 'message 3']);
          done();
        });
      });
    })

  })

  after(function(done) {
    db.dropCollection(collectionName, function(err, r) {
      db.close();
      done();
    });
  });
});
