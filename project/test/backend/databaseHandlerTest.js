"use strict";

process.env['database:db'] = 'social_website_test';
process.env.NODE_ENV = 'test';

require('should');
let Q = require('q');
let ObjectId = require('mongodb').ObjectId;

let config = require('../../lib/config');
let DatabaseHandler = require('../../lib/databaseHandler');
let UserSecurity = require('../../lib/userSecurity');
let errors = require('../../lib/errors');
let mongodb = require('mongodb');
let strings = require('../../lib/strings');

describe('DatabaseHandler', function() {
  let helper = require('./helper');
  let dbHandler = new DatabaseHandler();
  let length = config.get("security:sessions:tokenLength");
  let tokenPattern = new RegExp("^[" + config.get('security:sessions:tokenChars') + "]{" + length + "}$");
  dbHandler.connect();

  let cleanDb = function(done) {
    helper.cleanDb()
    .then(done);
  };

  before(function(done) {
    // Make sure tests are run on test db
    let pattern = /_test$/;

    if (!pattern.test(config.get('database:db'))) {
      console.error("DB used for testing should end with '_test'");
      process.exit(1);
    }
    helper.start()
    .then(dbHandler.connect)
    .then(() => done());
  });

  describe('prepareParams', function() {
    describe('Delete empty string', function() {
      it('should return the object with the empty key removed', function(done) {
          let params = {correct: 'correct', toBeRemoved: ''};
          DatabaseHandler._private.prepareParams(params);
          params.hasOwnProperty('correct').should.be.true();
          params.hasOwnProperty('toBeRemoved').should.be.false();
          done();
      });
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
    after(cleanDb);

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
      let username = "uname";

      before(function(done) {
        dbHandler.registerUser({'username': username, password: 'pw'}).then(() => done()).done();
      });

      after(cleanDb);

      it('should return an ArgumentError', function(done) {
        dbHandler.registerUser({'username': username, password: 'otherpw'})
        .then(null, function(err) {
          err.should.be.instanceOf(errors.SemanticsError);
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

  describe('checkToken', function() {
    describe('verify users token', function() {
      let user = null;
      before(function(done) {
        UserSecurity.hash('decentpassword')
        .then((pw) => dbHandler.registerUser({username: 'usname', password: pw}))
        .then((res) => user = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return true', function(done) {
        dbHandler.checkToken(user.token, user._id)
        .then(function(res) {
          res.should.be.true();
          done();
        });
      });
    });
  });

  describe("getUser", function() {
    describe('Get existing user', function() {
      let id = null;
      after(cleanDb);

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
      let id = null;
      let token = null;

      after(cleanDb);

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
          err.should.be.instanceOf(errors.SemanticsError);
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
            err.should.be.instanceOf(errors.ArgumentError);
            done();
          }).done();
      });
    });
  });

  describe("updatePassword", function() {
    describe("Update password of existing user w/o updating token", function() {
      let id = null;
      let password = "adecentpassword";
      let token = null;

      before('Create user to update', function(done) {
        dbHandler.registerUser({username:'uname', 'password':password})
        .then(function(res) {
          id = res._id;
          token = res.token;
          done();
        }).done();
      });

      after(cleanDb);

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
      let id = null;
      let password = "adecentpassword";
      let token = null;

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

      after(cleanDb);

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
      let id = null;
      let uname = 'username';

      before(function(done) {
        dbHandler.registerUser({username: uname, password: 'pw'})
        .then((res) => id = res._id)
        .then(() => done());
      });

      after(cleanDb);

      it('should return the correct user', function(done) {
        dbHandler.getManyById([id])
        .then(function(res) {
           res[0].username.should.equal(uname);
           done();
         })
        .done();
      });
    });

    describe('Get multiple users', function() {
      let users = [];

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

      after(cleanDb);

      it('should return the correct two users', function(done) {
        let ids = [users[0]._id, users[1]._id];
        dbHandler.getManyById(ids)
        .then(function(res) {
          res.length.should.equal(2);
          res.should.containDeep([users[0], users[1]]);
          done();
        })
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
        let ids = [(new ObjectId()).toString(), null];
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

      let user = null;

      before(function(done) {
        dbHandler.registerUser({username: 'usname', password: 'pw'})
        .then((res) => user = res)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should return the correct user', function(done) {
        dbHandler.searchUsers('usname')
        .then(function(res) {
          res[0]._id.should.equal(user._id);
          res[0].username.should.equal(user.username);
          done();
        })
        .done();
      });
    });

    describe('Search with keyword matching two of three users', function() {
      let users = [];

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

      after(cleanDb);

      it('should return the correct two users', function(done) {
        dbHandler.searchUsers('user')
        .then(function(res) {
          res.length.should.equal(2);
          res.should.containDeep([users[0], users[2]]);
          done();
        })
        .done();
      });
    });

    describe('Search with empty searchword', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.searchUsers('')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        })
        .done();
      });
    });
  });

  describe('newMessage', function() {
    describe('Insert a new valid message', function() {
      let users = null;
      before("Register two users", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => done())
        .done();
      });

      after(cleanDb);

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
      let id = null;
      before(function(done) {
        dbHandler.registerUser({username: 'usname', password: 'pw'})
        .then((res) => id = res._id)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should return ArgumentError in both cases', function(done) {
        dbHandler.newMessage(id, (new ObjectId()).toString(), 'hello')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.SemanticsError);
        })
        .then(() => dbHandler.newMessage((new ObjectId()).toString(), id, 'hello'))
        .then(null, function(err) {
          err.should.be.instanceOf(errors.SemanticsError);
          done();
        })
        .done();
      });
    });

    describe('Attempt to insert empty message', function() {
      let users = null;
      before("Register two users", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should return an ArgumentError', function(done) {
        dbHandler.newMessage(users[0]._id, users[1]._id, '')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        })
        .done();
      });
    });
  });

  describe('getMessages', function() {

    describe('Get two messages', function() {
      let users = null;
      let messages = null;
      before("Register two users and enter two messages", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((results) => users = results)
        .then(() => dbHandler.newMessage(users[0]._id, users[1]._id, 'a'))
        .then((res) => messages = [res])
        .then(() => dbHandler.newMessage(users[0]._id, users[1]._id, 'b'))
        .then((res) => messages[messages.length] = res)
        .then(() => done())
        .catch((err) => done(err))
        .done();
      });


      after(cleanDb);

      it('should return the two messages', function(done) {
        dbHandler.getMessages(users[1]._id)
        .then(function(res) {
          res.should.containDeep(messages);
          done();
        })
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
      let users = null;
      before("Register two users and enter two messages", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should work as expected', function(done) {
        dbHandler.newFriendship(users[0]._id, users[1]._id)
        .then(function(res) {
          ObjectId.isValid(res._id).should.be.true();
          done();
        })
        .done();
      });
    });

    describe('Create friendship between users with existing friendship', function() {
      let users = null;
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

      after(cleanDb);

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
          err.should.be.instanceOf(errors.ArgumentError);
        })
        .then(() => dbHandler.newFriendship('a', (new ObjectId()).toString()))
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });

    describe('Attempt to create friendship with self', function() {
      let user = null;
      before('Register a user', function(done){
        dbHandler.registerUser({username: 'usname', password: 'pw'})
        .then((res) => user = res)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should return ArgumentError', function(done) {
        dbHandler.newFriendship(user._id, user._id)
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        })
        .done();
      });
    });
  });

  describe('getFriendships', function() {
    let users = null;
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

      after(cleanDb);

      it('should find the two friendships', function(done) {
        dbHandler.getFriendships(users[0]._id)
        .then(function(res) {
          res.length.should.equal(2);
          done();
        });
      });
    });

    describe('Get with invalid id', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.getFriendships('a')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });
  });

  describe('checkIfFriends', function() {
    let users = null;
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


      after(cleanDb);

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
          err.should.be.instanceOf(errors.ArgumentError);
        })
        .then(() => dbHandler.checkIfFriends('a', (new ObjectId()).toString()))
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        });
      });
    });
  });

  describe('deleteMessage', function() {
    describe('Delete existing message', function() {
      let users = null;
      let message = null;
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

      after(cleanDb);

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
      });
    });
  });

  describe('unfriend', function() {
    describe('delete valid friendship', function() {
      let users = null;
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

      after(cleanDb);

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

  describe('getMessage', function() {
    describe('Get valid message', function() {
      let message = null;
      before("Register two users and create friendship", function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'NotCorrect', password: 'pw'})
        ])
        .then((users) => dbHandler.newMessage(users[0]._id, users[1]._id, 'a'))
        .then((res) => message = res)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should return the message', function(done) {
        dbHandler.getMessage(message._id)
        .then(function(m) {
          m.should.containDeep(message);
          done();
        });
      });
    });

    describe('Get with invalid id', function() {
      it('should return an ArgumentError', function(done) {
        dbHandler.getMessage('a')
        .then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          err.message.should.equal(strings.invalidId);
          done();
        });
      });
    });
  });

  after(() => helper.close());
});
