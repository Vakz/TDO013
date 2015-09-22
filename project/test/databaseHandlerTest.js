process.env['database:db'] = 'social_website_test';

require('should');
var Q = require('q');
var ObjectId = require('mongodb').ObjectId;

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
        dbHandler.getUser({username: 'uname'})
        .then(null, function(err){
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
        dbHandler.registerUser({'username': username, password: 'otherpw'})
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to create user without specifying all parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({username:'', password:'pw'})
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to add extra, non-valid, parameters', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({username:'username', password:'pw', extra:'aaa'})
        .then(null, function(err) {
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
        })
        .then(null, function(err) {
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
        dbHandler.updateToken(id)
        .then(function(res) {
          tokenPattern.test(res).should.be.true();
          res.should.not.equal(token);
          done();
        }).done();
      });
    });

    describe('Attempt to update non-existant user', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.updateToken((new mongodb.ObjectId()).toString())
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to update invalid id', function() {
      it('should return ArgumentError', function(done) {
          dbHandler.updateToken("a")
          .then(null, function(err) {
            err.should.be.instanceOf(errors.ArgumentError);
          })
          .then(() => dbHandler.updateToken(null))
          .then(null, function(err) {
            err.should.be.instanceOf(errors.ArgumentError)
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
        dbHandler.getManyById([id])
        .then((res) => res[0].username.should.equal(uname))
        .then(() => done())
        .done();
      });
    });

    describe('Get multiple users', function() {
      var users = [];

      before("Register three users", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'uname', password: 'pw'}),
          dbHandler.registerUser({username: 'usname', password: 'pw'}),
          dbHandler.registerUser({username: 'ulname', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => done())
        .done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return the correct two users', function(done) {
        var ids = [users[0]._id, users[1]._id];
        dbHandler.getManyById(ids)
        .then(function(res) {
          res.length.should.equal(2);
          res[0]._id.should.equal(users[0]._id);
          res[0].username.should.equal(users[0].username);
          res[1]._id.should.equal(users[1]._id);
          res[1].username.should.equal(users[1].username);
        })
        .then(() => done())
        .done();
      });
    });


    describe('Send only id', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.getManyById((new ObjectId()).toString())
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });

    describe('Enter an invalid id', function() {
      it('should return an ArgumentError', function(done) {
        var ids = [(new ObjectId()).toString(), null];
        dbHandler.getManyById(ids)
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });
  });

  describe('searchUsers', function() {
    describe('Search for a single user', function() {

      var user = null;

      before(function(done) {
        dbHandler.registerUser({username: 'usname', password: 'pw'})
        .then((res) => user = res)
        .then(() => done())
        .done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return the correct user', function() {
        dbHandler.searchUsers('usname')
        .then(function(res) {
          res._id.should.equal(user._id);
          res.username.should.equal(user.username);
        })
        .then(() => done())
        .done();
      });
    });

    describe('Search with keyword matching two of three users', function() {
      var users = [];

      before("Register three users", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => done())
        .done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return the correct two users', function(done) {
        dbHandler.searchUsers('user')
        .then(function(res) {
          res.length.should.equal(2);
          [users[0], users[2]].should.eql(res);
        })
        .then(() => done())
        .done();
      });
    });

    describe('Search with empty searchword', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.searchUsers('')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
        })
        .then(() => done())
        .done();
      });
    });
  });

  describe('newMessage', function() {
    describe('Insert a new valid message', function() {
      var users = null;
      before("Register two users", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => done())
        .done();
      });

      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:messages'));
        done();
      });

      it('should return a valid message', function(done) {
        dbHandler.newMessage(users[0]._id, users[1]._id, 'hello')
        .then(function(res) {
            res.from.should.equal(users[0]._id);
            res.to.should.equal(users[1]._id);
            res.message.should.equal('hello');
            ObjectId.isValid(res._id).should.be.true();
            done();
        })
        .done();
      });
    });

    describe('Attempt to insert messages where one user does not exist', function() {
      var id = null;
      before(function(done) {
        dbHandler.registerUser({username: 'usname', password: 'pw'})
        .then((res) => id = res._id)
        .then(() => done())
        .done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return ArgumentError in both cases', function(done) {
        dbHandler.newMessage(id, (new ObjectId()).toString(), 'hello')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
        })
        .then(() => dbHandler.newMessage((new ObjectId()).toString(), id, 'hello'))
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        })
        .done();
      });
    });

    describe('Attempt to insert empty message', function() {
      var users = null;
      before("Register two users", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => done())
        .done();
      });

      after((done) => cleanCollection(done, config.get('database:collections:auth')));

      it('should return an ArgumentError', function(done) {
        dbHandler.newMessage(users[0]._id, users[1]._id, '')
        .then(null, (err) => err.should.be.instanceOf(errors.ArgumentError))
        .then(() => done())
        .done();
      });
    });
  });

  describe('getMessages', function() {

    describe('Get two messages', function() {
      var users = null;
      var messages = null;
      before("Register two users and enter two messages", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => dbHandler.newMessage(users[0]._id, users[1]._id, 'hello'))
        .then((res) => messages = [res])
        .then(() => dbHandler.newMessage(users[0]._id, users[1]._id, 'again'))
        .then((res) => messages[messages.length] = res)
        .then(() => done())
        .done();
      });


      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:messages'));
        done();
      });

      it('should return the two messages', function(done) {
        dbHandler.getMessages(users[1]._id)
        .then(function(res) {
          res[0].should.eql(messages[0]);
          res[1].should.eql(messages[1]);
        })
        .then(() => done())
        .done();
      });
    });

    describe('Get message with invalid user id', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.getMessages('a')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });
  });

  describe('newFriendship', function() {
    describe('Create friendship between two users', function() {
      var users = null;
      before("Register two users and enter two messages", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done())
        .done();
      });

      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:friendships'));
        done();
      });

      it('should work as expected', function(done) {
        dbHandler.newFriendship(users[0]._id, users[1]._id)
        .then((res) => ObjectId.isValid(res._id).should.be.true())
        .then(() => done())
        .done();
      });
    });

    describe('Create friendship between users with existing friendship', function() {
      var users = null;
      before("Register two users and create friendship", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => done())
        .done();
      });

      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:friendships'));
        done();
      });

      it('should return an ArgumentError', function(done) {
        dbHandler.newFriendship(users[0]._id, users[1]._id)
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        })
        .done();
      });
    });

    describe('Attempt to create friendship where either is invalid', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.newFriendship((new ObjectId()).toString(), 'a')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError)
        })
        .then(() => dbHandler.newFriendship('a', (new ObjectId()).toString()))
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      })
    })

    describe('Attempt to create friendship with self', function() {
      var user = null;
      before('Register a user', function(done){
        dbHandler.registerUser({username: 'usname', password: 'pw'})
        .then((res) => user = res)
        .then(() => done())
        .done();
      });

      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        done();
      });

      it('should return ArgumentError', function(done) {
        dbHandler.newFriendship(user._id, user._id)
        .then(null, (err) => err.should.be.instanceOf(errors.ArgumentError))
        .then(() => done())
        .done();
      });
    });
  });

  describe('getFriendships', function() {
    var users = null;
    describe('Get two friendships', function() {
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'}),
          dbHandler.registerUser({username: 'userThree', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(function() {
          return Q.all([
            dbHandler.newFriendship(users[0]._id, users[1]._id),
            dbHandler.newFriendship(users[0]._id, users[2]._id)
          ]);
        })
        .then(() => done())
        .done();
      });

      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:friendships'));
        done();
      });

      it('should find the two friendships', function(done) {
        dbHandler.getFriendships(users[0]._id)
        .then(function(res) {
          res.length.should.equal(2);
          done();
        });
      });
    })

    describe('Get with invalid id', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.getFriendships('a')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    })
  });

  describe('checkIfFriends', function() {
    describe('Create valid friendship', function() {

      before("Register two users and create friendship", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => done())
        .done();
      });


      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:friendships'));
        done();
      });

      it('should return true', function(done) {
        dbHandler.checkIfFriends(users[0]._id, users[1]._id)
        .then((res) => res.should.be.true())
        .then(() => dbHandler.checkIfFriends(users[1]._id, users[0]._id))
        .then(function(res) {
          res.should.be.true();
          done();
        })
        .done();
      });
    });

    describe('Check friendship where either id is invalid', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.checkIfFriends((new ObjectId()).toString(), 'a')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError)
        })
        .then(() => dbHandler.checkIfFriends('a', (new ObjectId()).toString()))
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      })
    });
  });

  describe('deleteMessage', function() {
    describe('Delete existing message', function() {
      var users = null;
      var message = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newMessage(users[0]._id, users[1]._id, 'hello'))
        .then(function(res) {
          message = res;
          done();
        });
      });

      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:messages'));
        done();
      });

      it('should return true', function(done) {
        dbHandler.deleteMessage(message._id)
        .then(function(res) {
          res.should.be.true();
          done();
        })
        .done();
      });
    });

    describe('delete non-existant message', function() {
      it('should return false', function(done) {
        dbHandler.deleteMessage((new ObjectId()).toString())
        .then(function(res) {
          res.should.be.false();
          done();
        })
        .done();
      });
    });

    describe('delete invalid id', function() {
      it('should return ArgumentError', function(done) {
        dbHandler.deleteMessage('a')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        })
        .done();
      })
    })
  });

  describe('unfriend', function() {
    describe('delete valid friendship', function() {
      var users = null;
      before("Register two users and create friendship", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => done())
        .done();
      });

      after(function(done) {
        cleanCollection(done, config.get('database:collections:auth'));
        cleanCollection(done, config.get('database:collections:friendships'));
        done();
      });

      it('should return true and users should no longer be friends', function(done) {
        dbHandler.unfriend(users[0]._id, users[1]._id)
        .then((res) => res.should.be.true())
        .then(() => dbHandler.checkIfFriends(users[0]._id, users[1]._id))
        .then(function(res) {
          res.should.be.false();
          done();
        })
        .done();
      });
    });

    describe('Delete non-existant friendship', function() {
      it('should return true', function(done) {
        dbHandler.unfriend((new ObjectId()).toString(), (new ObjectId()).toString())
        .then(function(res) {
          res.should.be.false();
          done();
        });
      });
    });

    describe('Attempt to delete where either id is invalid', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.unfriend((new ObjectId()).toString(), 'a')
        .then(null, (err) => err.should.be.instanceOf(errors.ArgumentError))
        .then(() => dbHandler.unfriend('a', (new ObjectId()).toString()))
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });
  });

  after(() => db.close());
});
