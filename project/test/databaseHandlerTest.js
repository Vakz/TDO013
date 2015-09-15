process.env['database:db'] = 'social_website_test';

require('should');
var async = require('async');

var config = require('../lib/config');
var DatabaseHandler = require('../lib/databaseHandler');
var MongoClient = require('mongodb').MongoClient;
var errors = require('../lib/errors');

describe('DatabaseHandler', function() {
  var db = null;
  var dbHandler = new DatabaseHandler();

  var cleanCollection = function(done, collection) {
    db.collection(collection).remove({});
    db.collection(collection).count(function(err, count) {
      count.should.equal(0);
      done();
    })
  };

  before(function(done) {
    var getDb = function(callback) {
      MongoClient.connect(config.get('database:address') + config.get('database:db')
      , function(err, _db) {
        if (err) throw (err);
        db = _db;
        callback();
      }
    );
  };

    async.parallel([getDb, (callback) => dbHandler.connect(() => callback())], done)
  });

  describe('User creation', function() {
    afterEach(done => cleanCollection(done, config.get('database:collections:auth')));

    describe('Create valid user', function() {
      it('should return a newly registered user with id', function(done) {
        dbHandler.registerUser('name', 'salt', 'pw', function(err, res) {
          (err === null).should.be.true();
          res.username.should.equal('name');
          res.salt.should.equal('salt');
          res.password.should.equal('pw');
          done();
        });
      });
    });

    describe('Attempt to create user with taken username', function() {
      var username = "uname";

      before(function(done) {
        dbHandler.registerUser(username, 'salt', 'pw', () => done());
      });

      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser(username, 'othersalt', 'otherpw', function(err, res) {
          err.should.be.instanceOf(errors.ArgumentError);
          db.collection(config.get('database:collections:auth')).count(function(err, count) {
            count.should.equal(1);
            done();
          });
        });
      });
    });

    describe('Attempt to create user without specifying all parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser('', 'salt', 'pw', function(err, res) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });
  });
});
