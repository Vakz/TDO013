process.env['database:db'] = 'social_website_test';

require('should');

var config = require('../lib/config');
var DatabaseHandler = require('../lib/databaseHandler');
var errors = require('../lib/errors');

describe('DatabaseHandler', function() {
  var db = require('monk')(config.get('database:address') + config.get('database:db'));
  var dbHandler = new DatabaseHandler();

  var cleanCollection = function(done, collection) {
    db.get(collection).drop().complete(() => done());
  };

  before(function() {
    // Make sure tests are run on test db
    var pattern = /_test$/;

    if (!pattern.test(config.get('database:db'))) {
      console.error("DB used for testing should end with '_test'");
      process.exit(1);
    }
  });

  describe("General database functions", function() {
    describe("Attempt to make query when db is closed", function() {
      before(dbHandler.close);

      it('should return a DatabaseError', function(done) {
        db.close();
        dbHandler.getUser({username: 'uname'}).then(null, function(err){
          err.should.be.instanceOf(errors.DatabaseError);
          done();
        }).done() ;
      });

      after(dbHandler.connect);
    });
  });

  describe('registerUser', function() {
    after((done) => cleanCollection(done, config.get('database:collections:auth')));

      describe('Create valid user', function() {
        it('should return a newly registered user with id', function(done) {
          dbHandler.registerUser({username:'name', salt:'salt', password:'pw'}).then(function(res) {
            res.username.should.equal('name');
            res.salt.should.equal('salt');
            res.password.should.equal('pw');
            done();
          }).done();
        });
      });

    describe('Attempt to create user with taken username', function() {
      var username = "uname";

      before(function(done) {
        dbHandler.registerUser({'username': username, salt: 'salt', password: 'pw'}).then(() => done()).done();
      });

      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({'username': username, salt: 'othersalt', password: 'otherpw'}).then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to create user without specifying all parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({username:'', salt:'salt', password:'pw'}).then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to add extra, non-valid, parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({username:'username', salt:'salt', password:'pw', extra:'aaa'}).then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

  });

  describe("getUser", function() {
    describe('Get existing user', function() {
      var id = null;
      after(done => cleanCollection(done, config.get('database:collections:auth')));

      before('Create user to find', function(done) {
        dbHandler.registerUser({username:'uname', salt:'salt', password:'pw'}).then(function(res) {
          id = res._id;
          done();
        }).done();
      });

      it('should return the correct user', function(done) {
        dbHandler.getUser({username: 'uname'})
          .then(function(res) {
            res._id.equals(id).should.be.true();
            return dbHandler.getUser({_id: id});})
          .then(function(res) {
            res.username.should.equal('uname');
            done();
        }).done();
      });
    });

    describe('Get non-existant user', function() {
      it('should return null', function(done) {
        dbHandler.getUser({username: 'uname'}).then(function(res) {
          (res === null).should.be.true();
          done();
        }).done();
      });
    });

    describe('Call with no parameters', function() {
      it('should return ArgumentError', function(done) {

        dbHandler.getUser({}).then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          return dbHandler.getUser({username: ' '});
        }).then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });
  });

  after(() => db.close());
});
