process.env['database:db'] = 'social_website_test';

require('should');

var config = require('../lib/config');
var DatabaseHandler = require('../lib/databaseHandler');
var UserSecurity = require('../lib/userSecurity');
var errors = require('../lib/errors');
var mongodb = require('mongodb');

describe('DatabaseHandler', function() {
  var db = null;
  var dbHandler = new DatabaseHandler();
  var length = config.get("security:sessions:tokenLength");
  var tokenPattern = new RegExp("^[" + config.get('security:sessions:tokenChars') + "]{" + length + "}$");
  dbHandler.connect();

  var cleanCollection = function(done, collection) {
    db.collection(collection).removeMany();
    done();
  };

  before(function(done) {
    // Make sure tests are run on test db
    var pattern = /_test$/;

    if (!pattern.test(config.get('database:db'))) {
      console.error("DB used for testing should end with '_test'");
      process.exit(1);
    }
    mongodb.MongoClient.connect(
      config.get('database:address') + config.get('database:db'),
      function(err, _db) {
        db = _db;
        dbHandler.connect().then(() => done());
    });

  });

  describe("General database functions", function() {
    describe("Attempt to make query when db is closed", function() {

      it('should return a DatabaseError', function(done) {
        dbHandler.close();
        dbHandler.getUser({username: 'uname'}).catch(function(err){
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
          dbHandler.registerUser({username:'name', password:'pw'}).then(function(res) {
            res.username.should.equal('name');
            res.password.should.equal('pw');
            tokenPattern.test(res.token).should.be.true();
            done();
          }).done();
        });
      });

    describe('Attempt to create user with taken username', function() {
      var username = "uname";

      before(function(done) {
        dbHandler.registerUser({'username': username, password: 'pw'}).then(() => done()).done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({'username': username, password: 'otherpw'}).catch(function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to create user without specifying all parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({username:'', password:'pw'}).catch(function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to add extra, non-valid, parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({username:'username', password:'pw', extra:'aaa'}).catch(function(err) {
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
        dbHandler.registerUser({username:'uname', password:'pw'}).then(function(res) {
          id = res._id;
          done();
        }).done();
      });

      it('should return the correct user', function(done) {
        dbHandler.getUser({username: 'uname'})
          .then(function(res) {
            res._id.should.equal(id);
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
        }).catch(function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });
  });

  describe("updateToken", function() {
    describe('Update token of existing user', function() {
      var id = null;
      var token = null;

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      before('Create a user to update', function(done) {
        dbHandler.registerUser({username: 'uname', password: 'pw'})
        .then(
          function(res) {
            token = res.token;
            id = res._id;
            tokenPattern.test(token).should.be.true();
            done();
          })
        .done();
      });

      it('should return new token', function(done) {
        dbHandler.updateToken(id).then(function(res) {
          tokenPattern.test(res).should.be.true();
          res.should.not.equal(token);
          done();
        }).done();
      });
    });

    describe('Attempt to update non-existant user', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.updateToken((new mongodb.ObjectId()).toString())
        .catch(function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to update invalid id', function() {
      it('should return ArgumentError', function(done) {
          dbHandler.updateToken("a")
          .catch(function(err) {
            err.should.be.instanceOf(errors.ArgumentError);
            done();
          }).done();
      });
    });
  });

  describe("updatePassword", function() {
    describe("Update password of existing user w/o updating token", function() {
      var id = null;
      var password = "adecentpassword";
      var token = null;

      before('Create user to update', function(done) {
        dbHandler.registerUser({username:'uname', 'password':password})
        .then(function(res) {
          id = res._id;
          token = res.token;
          done();
        }).done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return user with new password and old token', function(done) {
        dbHandler.updatePassword(id, 'newpassword', false)
        .then(function(val) {
          val.password.should.not.equal(password);
          val.token.should.equal(token);
          done();
        })
        .done();
      });
    });

    describe("Update password and token of existing user", function() {
      var id = null;
      var password = "adecentpassword";
      var token = null;

      before(function(done) {
        dbHandler.registerUser({username: 'uname', password: 'pw'})
        .then(
          function(res) {
            token = res.token;
            id = res._id;
            tokenPattern.test(token).should.be.true();
            done();
          })
        .done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return user with new password and old token', function(done) {
        dbHandler.updatePassword(id, 'newpassword', true)
        .then(function(val) {
          val.password.should.not.equal(password);
          val.token.should.not.equal(token);
          done();
        })
        .done();
      });
    });
  });

  describe('getManyById', function() {
    describe('Get single user', function() {
      var id = null;
      var uname = 'username';

      before(function(done) {
        dbHandler.registerUser({username: uname, password: 'pw'})
        .then((res) => id = res._id)
        .then(() => done());
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return the correct user', function(done) {
        dbHandler.findManyById([id])
        .then((res) => res[0].username.should.equal(uname))
        .then(() => done())
        .done();
      });
    });

    describe.skip('Get multiple users', function() {
      var users = {};

      before(function(done) {
        dbHandler.registerUser({})
      });

      it('should return the correct two users', function(done) {

      });
    });
  });

  after(() => db.close());
});
