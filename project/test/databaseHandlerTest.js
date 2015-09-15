process.env['database:db'] = 'social_website_test';

require('should');
var async = require('async');

var config = require('../lib/config');
var DatabaseHandler = require('../lib/databaseHandler');
var errors = require('../lib/errors');
var mongodb = require('mongodb');

describe('DatabaseHandler', function() {
  var db = null;
  var dbHandler = new DatabaseHandler();

  var cleanCollection = function(done, collection) {
    db.collection(collection).remove({});
    db.collection(collection).count(function(err, count) {
      count.should.equal(0);
      done();
    });
  };

  before(function(done) {
    // Make sure tests are run on test db
    var pattern = /_test$/;

    if (!pattern.test(config.get('database:db'))) {
      console.error("DB used for testing should end with '_test'");
      process.exit(1);
    }

    var getDb = function(callback) {
      mongodb.MongoClient.connect(config.get('database:address') + config.get('database:db'),
      function(err, _db) {
        if (err) throw (err);
        db = _db;
        callback();
      }
    );
  };

    async.parallel([getDb, (callback) => dbHandler.connect(() => callback())], done);
  });

  describe("General database functions", function() {
    describe("Attempt to open db when already open", function() {
      it('should return a DatabaseError', function(done) {
        dbHandler.connect(function(err, res) {
          err.should.be.instanceOf(errors.DatabaseError);
          done();
        });
      });
    });

    describe("Close then reopen database", function() {
      it('should return true', function(done) {
        dbHandler.close();
        dbHandler.connect(function(err, res) {
          res.should.be.true();
          done();
        });
      });
    });

    describe("Attempt to make query when db is closed", function() {
      var queryFunc = function(callback) {
        dbHandler.getUser({username: 'uname'}, function(err, res) {
          err.should.be.instanceOf(errors.DatabaseError);
          callback();
        });
      };

      it('should return a DatabaseError', function(done) {
        async.series([(callback) => dbHandler.close(callback),
          (callback) => queryFunc(callback)], done);
      });

      after(done => dbHandler.connect(done));
    });

    describe("Attempt to close non-open db", function() {

      before((done) => dbHandler.close(done));

      it('should return a DatabaseError', function(done) {
        dbHandler.close(function(err, r) {
          err.should.be.instanceOf(errors.DatabaseError);
          done();
        });
      });

      after((done) => dbHandler.connect(done));
    });
  });

  describe('registerUser', function() {
    afterEach(done => cleanCollection(done, config.get('database:collections:auth')));

    describe('Create valid user', function() {
      it('should return a newly registered user with id', function(done) {
        dbHandler.registerUser({username:'name', salt:'salt', password:'pw'}, function(err, res) {
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
        dbHandler.registerUser({'username': username, salt: 'salt', password: 'pw'}, () => done());
      });

      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({'username': username, salt: 'othersalt', password: 'otherpw'}, function(err, res) {
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
        dbHandler.registerUser({username:'', salt:'salt', password:'pw'}, function(err, res) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });

    describe('Attempt to add extra, non-valid, parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({username:'username', salt:'salt', password:'pw', extra:'aaa'}, function(err, res) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });
  });

  describe("getUser", function() {
    describe('Get existing user', function() {
      var id = null;
      after(done => cleanCollection(done, config.get('database:collections:auth')));

      before('Create user to find', function(done) {
        dbHandler.registerUser({username:'uname', salt:'salt', password:'pw'}, function(err, res) {
          id = res._id.toString();
          done();
        });
      });
      it('should return the correct user', function(done) {
        async.parallel([
          (callback) => dbHandler.getUser({username: 'uname'},
            function(err, res) { res._id.toString().should.equal(id); callback(); }),
          (callback) => dbHandler.getUser({_id: new mongodb.ObjectId(id)},
            function(err, res) { res._id.toString().should.equal(id); callback(); }),
        ], done);
      });
    });

    describe('Get non-existant user', function() {
      it('should return null', function(done) {
        dbHandler.getUser({username: 'uname'}, function(err, res) {
          (res === null).should.be.true();
          done();
        });
      });
    });

    describe('Call with no parameters', function() {
      it('should return ArgumentError', function(done) {
        async.parallel([
          (callback) => dbHandler.getUser({},
            function(err, res) { err.should.be.instanceOf(errors.ArgumentError); callback(); }),
          (callback) => dbHandler.getUser({username: ' '},
            function(err, res) { err.should.be.instanceOf(errors.ArgumentError); callback(); })
        ], done);
      });
    });
  });

  after(() => db.close());
});
