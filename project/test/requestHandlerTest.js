"use strict";

process.env['database:db'] = 'social_website_test';
process.env.NODE_ENV = 'test';
require('should');
let Q = require('q');

let config = require('../lib/config');
let DatabaseHandler = require('../lib/databaseHandler');
let RequestHandler = require('../lib/requestHandler');
let httpMocks = require('node-mocks-http');
let ArgumentError = require('../lib/errors').ArgumentError;
let DatabaseError = require('../lib/errors').DatabaseError;
let UserSecurity = require('../lib/userSecurity');
let sessions = require('client-sessions');
let ObjectId = require('mongodb').ObjectId;
let RandExp = require('randexp');
let strings = require('../lib/strings');

let setupResponse = function(done) {
  let response = httpMocks.createResponse(
    {'eventEmitter': require('events').EventEmitter,
     'writableStream': require('stream').Writable });
  response.setEncoding('utf8');

  response.on('error', function(err) {
    throw new Error(err);
  });

  response.on('end', function(data) {
    done(response._getData());
  });
  return response;
};

describe('RequestHandler', function() {
  let dbHandler = new DatabaseHandler();
  let reqHandler = new RequestHandler(dbHandler);

  let helper = require('./helper');
  let sessionHandler = sessions(UserSecurity.getSessionOptions());

  let cleanDb = function(done) {
    helper.cleanDb()
    .then(done);
  };

  before(function(done) {
    let pattern = /_test$/;
    if (!pattern.test(config.get('database:db'))) {
      console.error("DB used for testing should end with '_test'");
      process.exit(1);
    }
    helper.start()
    .then(dbHandler.connect)
    .then(() => done())
    .done();
  });

  describe('errorHandler', function() {
    describe('Test ArgumentError', function() {
      it('should return 400 and the error message', function(done) {
        let message = "Generic error message";
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(message);
          done();
        });
        RequestHandler._private.errorHandler(res, new ArgumentError(message));
      });
    });

    describe('Test DatabaseError', function() {
      it('should return 503 and the error message', function(done) {
        let message = "Generic database error message";
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(503);
          data.should.equal(message);
          done();
        });
        RequestHandler._private.errorHandler(res, new DatabaseError(message));
      });
    });

    describe('Test generic error', function() {
      it('should return 500', function(done) {
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(500);
          done();
        });
        RequestHandler._private.errorHandler(res, new Error());
      });
    });
  });

  describe('getUsersById', function() {
    let users = null;
    describe('Make a valid request', function() {
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return the usernames of the two users', function(done) {
        let ids = [users[0]._id, users[1]._id];
        let req = httpMocks.createRequest({'url': '/getUsersById?ids=' + JSON.stringify(ids)});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          res.getHeader('Content-Type').should.equal('application/json');
          let expectedData = [
            {_id: users[0]._id, username: users[0].username},
            {_id: users[1]._id, username: users[1].username}
          ];
          JSON.parse(data).should.eql(expectedData);
          done();
        });
        reqHandler.getUsersById(req, res);
      });
    });

    describe('Make request with invalid ids', function() {
      it('should return 400', function(done) {
        let ids = ['a', 'b'];
        let req = httpMocks.createRequest({'url': '/getUsersById?ids=' + JSON.stringify(ids)});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getUsersById(req, res);
      });
    });

    describe('Make request with non-array', function() {
      it('should return 400', function(done) {
        let ids = 'a';
        let req = httpMocks.createRequest({'url': '/getUsersById?ids=' + JSON.stringify(ids)});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getUsersById(req, res);
      });
    });

    describe('Make request without parameter', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({'url': '/getUsersById'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getUsersById(req, res);
      });
    });
  });

  describe('register', function() {
    describe('register valid user', function() {
      after(cleanDb);

      it('should return 200', function(done) {
        // Not stringifying body as bodyParser is added as middleware on a higher
        // level of the application, and thus is not included yet
        let req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'uname', password: 'decentpassword'}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          done();
        });
        req.session = {};
        reqHandler.register(req, res);
      });
    });

    describe('register with too short password', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'uname', password: 'short'}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        req.session = {};
        reqHandler.register(req, res);
      });
    });

    describe('register with missing parameters', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'uname'}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        req.session = {};
        reqHandler.register(req, res);
      });
    });

    describe('attempt to register taken username', function() {
      after(cleanDb);
      before(function(done) {
        dbHandler.registerUser({username: 'usname', password: 'decentpassword'})
        .then(() => done());
      });

      it('should return 422', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'usname', password: 'decentpassword'}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(422);
          done();
        });
        req.session = {};
        reqHandler.register(req, res);
      });
    });
  });

  describe('login', function() {
    describe('login with valid user', function() {

      after(cleanDb);
      before(function(done) {
        UserSecurity.hash('decentpassword')
        .then((pw) => dbHandler.registerUser({username: 'usname', password: pw}))
        .then(() => done());
      });

      it('should return 200', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/login',
        body: {username: 'usname', password: 'decentpassword'}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).username.should.equal('usname');
          done();
        });
        req.session = {};
        reqHandler.login(req, res);
      });
    });

    describe('attempt to login with non-existant user', function() {
      it('should return 422', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/login',
        body: {username: 'usname', password: UserSecurity.hash('decentpassword')}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(422);
          done();
        });
        req.session = {};
        reqHandler.login(req, res);
      });
    });

    describe('Attempt to login with incorrect password', function() {
      after(cleanDb);
      before(function(done) {
        UserSecurity.hash('decentpassword')
        .then((pw) => dbHandler.registerUser({username: 'usname', password: pw}))
        .then(() => done());
      });

      it('should return 422', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/login',
        body: {username: 'usname', password: 'incorrect'}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(422);
          done();
        });
        req.session = {};
        reqHandler.login(req, res);
      });
    });

    describe('Attempt to login with missing parameters', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/login',
        body: {username: 'usname'}});

        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        req.session = {};
        reqHandler.login(req, res);
      });
    });
  });

  describe('logout', function() {
    describe('logout valid user', function() {
      it('should return 200', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/logout'});
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(204);
          done();
        });

        sessionHandler(req, res, function() {
          req.session.loggedIn = true;
          reqHandler.logout(req, res);
        });
      });
    });

    describe('logout without being logged in', function() {
      it('should return an 400', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url: '/logout'});
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });

        sessionHandler(req, res, function() {
          reqHandler.logout(req, res);
        });
      });
    });
  });

  describe('resetSessions', function() {
    describe('try to reset without being logged in', function() {
      it('it should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'PUT', url: '/resetSessions'});
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });

        sessionHandler(req, res, function() {
          reqHandler.resetSessions(req, res);
        });
      });
    });

    describe('reset valid user', function() {
      let user = null;
      before(function(done) {
        UserSecurity.hash('decentpassword')
        .then((pw) => dbHandler.registerUser({username: 'usname', password: pw}))
        .then((res) => user = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should create a new token and make the old one invalid', function(done) {
        let req = httpMocks.createRequest({method: 'PUT', url: '/resetSessions'});
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(204);

          let reqLogin = httpMocks.createRequest({method: 'POST', url: '/login',
          body: {username: 'usname', password: 'decentpassword'}});

          let resLogin = setupResponse(function(data) {
            resLogin.statusCode.should.equal(200);
            // Make sure user has a new token
            reqLogin.session.token.should.not.equal(user.token);
            done();
          });
          reqLogin.session = {};
          reqHandler.login(reqLogin, resLogin);
        });
        sessionHandler(req, res, function() {
          req.session.loggedIn = true;
          req.session.token = user.token;
          req.session._id = user._id;
          reqHandler.resetSessions(req, res);
        });
      });
    });
  });

  describe('updatePassword', function() {
    describe('update password without updating token', function() {
      let user = null;
      before(function(done) {
        UserSecurity.hash('decentpassword')
        .then((pw) => dbHandler.registerUser({username: 'usname', password: pw}))
        .then((res) => user = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200 and token should remain the same', function(done) {
        let req = httpMocks.createRequest({method: 'PUT', url: '/updatePassword',
        body: {password: 'anewgoodpassword', reset: false}});
        let res = setupResponse(function(data) {

          res.statusCode.should.equal(204);
          dbHandler.getUser({_id: user._id})
          .then((res) => res.token.should.equal(user.token))
          .then(() => done());
        });
        req.session = {loggedIn: true, _id: user._id, token: user.token};
        reqHandler.updatePassword(req, res);
      });
    });

    describe('update password and update token', function() {
      let user = null;
      before(function(done) {
        UserSecurity.hash('decentpassword')
        .then((pw) => dbHandler.registerUser({username: 'usname', password: pw}))
        .then((res) => user = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200 and token should remain the same', function(done) {
        let req = httpMocks.createRequest({method: 'PUT', url: '/updatePassword',
        body: {password: 'anewgoodpassword', reset: true}});
        let res = setupResponse(function(data) {

          res.statusCode.should.equal(204);
          dbHandler.getUser({_id: user._id})
          .then((res) => res.token.should.not.equal(user.token))
          .then(() => done());
        });
        req.session = {loggedIn: true, _id: user._id, token: user.token};
        reqHandler.updatePassword(req, res);
      });
    });

    describe('update password to too short word', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'PUT', url: '/updatePassword',
        body: {password: 'short'}});
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        req.session = {loggedIn: true};
        reqHandler.updatePassword(req, res);
      });
    });

    describe('update password without specifying new password', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'PUT', url: '/updatePassword'});
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        req.session = {loggedIn: true};
        reqHandler.updatePassword(req, res);
      });
    });

    describe('Attempt to update when not logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'PUT', url: '/updatePassword'});
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        req.session = {};
        reqHandler.updatePassword(req, res);
      });
    });
  });

  describe('getProfile', function() {
    describe('Get valid profile', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => dbHandler.newMessage(users[0]._id, users[1]._id, 'hello'))
        .then(() => done());
      });

      after(cleanDb);

      it('should find the correct user and its messages', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url: '/getProfile?id=' + users[1]._id});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).messages[0].message.should.equal('hello');
          done();
        });
        reqHandler.getProfile(req, res);
      });
    });

    describe('Attempt to get without being friends', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url: '/getProfile?id=' + users[1]._id});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getProfile(req, res);
      });
    });

    describe('Attempt to get without specifying parameter', function(done) {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'GET', url: '/getProfile'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getProfile(req, res);
      });
    });

    describe('Attempt to get without being logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'GET', url: '/getProfile'});
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getProfile(req, res);
      });
    });

    describe('Get own profile', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => dbHandler.newMessage(users[0]._id, users[1]._id, 'hello'))
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200 and correct message', function(done) {
        let req = httpMocks.createRequest({method:'GET', url:'/getProfile?id=' + users[1]._id});
        req.session = {loggedIn: true, _id: users[1]._id, username: users[1].username};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).messages[0].message.should.equal('hello');
          done();
        });
        reqHandler.getProfile(req, res);
      });
    });
  });

  describe('search', function() {
    describe('search when not logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'GET', url:'/search'});
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.search(req, res);
      });
    });

    describe('search without searchword', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'GET', url:'/search'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.search(req, res);
      });
    });

    describe('Make valid search', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'AuserOne', password: 'pw'}),
          dbHandler.registerUser({username: 'BuserTwo', password: 'pw'}),
          dbHandler.registerUser({username: 'notCorrect', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should return 200 and correct two users', function(done) {
        let req = httpMocks.createRequest({method:'GET', url:'/search?searchword=user'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          data = JSON.parse(data);
          data.length.should.equal(2);
          data.should.containDeep([{username: users[0].username, _id: users[0]._id}, {username: users[1].username, _id: users[1]._id}]);
          done();
        });
        reqHandler.search(req, res);
      });
    });
  });

  describe('sendMessage', function() {
    let makeRequest = (id, msg) => httpMocks.createRequest({method:'POST', url:'/sendMessage',
                            body: {receiver: id, message: msg}});

    describe('send when not logged in', function() {
      it('should return 400', function(done) {
        let req = makeRequest((new ObjectId()).toString(), 'hello');
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.sendMessage(req, res);
      });
    });

    describe('omit id', function() {
      it('should return 400', function(done) {
        let req = makeRequest('', 'hello');
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noParamReceiver);
          done();
        });
        reqHandler.sendMessage(req, res);
      });
    });

    describe('omit message', function() {
      it('should return 400', function(done) {
        let req = makeRequest((new ObjectId()).toString(), '');
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noParamMessage);
          done();
        });
        reqHandler.sendMessage(req, res);
      });
    });

    describe('too long message', function() {
      it('should return 422', function(done) {
        let req = makeRequest((new ObjectId()).toString(), (new RandExp(/\w{201}/).gen()));
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(422);
          done();
        });
        reqHandler.sendMessage(req, res);
      });
    });

    describe('send message to non-friend', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'AuserOne', password: 'pw'}),
          dbHandler.registerUser({username: 'BuserTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done())
        .done();
      });

      after(cleanDb);

      it('should return 400', function(done) {
        let req = makeRequest(users[1]._id, 'hello');
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noAccess);
          done();
        });
        reqHandler.sendMessage(req, res);
      });
    });

    describe('send valid message', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200 and the message', function(done) {
        let req = makeRequest(users[1]._id, 'hello');
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).should.containDeep({from: users[0]._id, to: users[1]._id, message:'hello'});
          done();
        });
        reqHandler.sendMessage(req, res);
      });
    });
  });

  describe('deleteMessage', function() {
    describe('delete when not logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'DELETE', url:'/deleteMessage'});
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.notLoggedIn);
          done();
        });
        reqHandler.deleteMessage(req, res);
      });
    });

    describe('omit message id', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'DELETE', url:'/deleteMessage'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noParamMessageId);
          done();
        });
        reqHandler.deleteMessage(req, res);
      });
    });

    describe('delete non-existant message', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'DELETE', url:'/deleteMessage',
                  body: {messageId: (new ObjectId()).toString()}});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noMessage);
          done();
        });
        reqHandler.deleteMessage(req, res);
      });
    });

    describe('delete message owned by another user', function() {
      let users = null;
      let message = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then((users) => dbHandler.newMessage(users[0]._id, users[1]._id, 'a'))
        .then((res) => message = res)
        .then(() => done());
      });


      after(cleanDb);

      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method:'DELETE', url:'/deleteMessage',
                  body: { messageId: message._id }});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.notOwnedMessage);
          done();
        });
        reqHandler.deleteMessage(req, res);
      });
    });

    describe('make valid delete request', function() {
      let users = null;
      let message = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then((users) => dbHandler.newMessage(users[0]._id, users[1]._id, 'a'))
        .then((res) => message = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 204', function(done) {
        let req = httpMocks.createRequest({method:'DELETE', url:'/deleteMessage',
                  body: { messageId: message._id }});
        req.session = {loggedIn: true, _id: users[1]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(204);
          done();
        });
        reqHandler.deleteMessage(req, res);
      });
    });
  });


  describe('addFriend', function() {
    describe('add friend when not logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url:'/addFriend'});
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.notLoggedIn);
          done();
        });
        reqHandler.addFriend(req, res);
      });
    });

    describe('omit friend id', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url:'/addFriend'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noParamFriendId);
          done();
        });
        reqHandler.addFriend(req, res);
      });
    });

    describe('attempt to add existing friend', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => done());
      });

      after(cleanDb);

      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url:'/addFriend',
                  body: {friendId: users[1]._id}});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.alreadyFriends);
          done();
        });
        reqHandler.addFriend(req, res);
      });
    });

    describe('make valid friendship', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 204', function(done) {
        let req = httpMocks.createRequest({method: 'POST', url:'/addFriend',
                  body: {friendId: users[1]._id}});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(204);
          done();
        });
        reqHandler.addFriend(req, res);
      });
    });
  });

  describe('unfriend', function() {
    describe('remove friend when not logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'DELETE', url:'/unfriend'});
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.notLoggedIn);
          done();
        });
        reqHandler.unfriend(req, res);
      });
    });

    describe('omit friend id', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'DELETE', url:'/unfriend'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noParamFriendId);
          done();
        });
        reqHandler.unfriend(req, res);
      });
    });

    describe('remove non-friend', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'DELETE', url:'/unfriend',
                  body: {friendId: users[1]._id}});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.notFriends);
          done();
        });
        reqHandler.unfriend(req, res);
      });
    });

    describe('remove valid friend', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => done());
      });

      after(cleanDb);

      it('should return 204', function(done) {
        let req = httpMocks.createRequest({method: 'DELETE', url:'/unfriend',
                  body: {friendId: users[1]._id}});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(204);
          done();
        });
        reqHandler.unfriend(req, res);
      });
    });
  });

  describe('checkIfFriends', function() {
    describe('check friend when not logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/checkIfFriends'});
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.notLoggedIn);
          done();
        });
        reqHandler.checkIfFriends(req, res);
      });
    });

    describe('omit friend id', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/checkIfFriends'});
        req.session = {loggedIn: true};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noParamFriendId);
          done();
        });
        reqHandler.checkIfFriends(req, res);
      });
    });

    describe('Check non-existant friend', function() {
      let user = null;
      before(function(done) {
        dbHandler.registerUser({username: 'userOne', password: 'pw'})
        .then((res) => user = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/checkIfFriends?friendId=' + (new ObjectId()).toString()});
        req.session = {loggedIn: true, _id: user._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.noUser);
          done();
        });
        reqHandler.checkIfFriends(req, res);
      });
    });

    describe('Check valid friend', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/checkIfFriends?friendId=' + users[1]._id});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).friends.should.be.true();
          done();
        });
        reqHandler.checkIfFriends(req, res);
      });
    });

    describe('Check valid non-friend', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/checkIfFriends?friendId=' + users[1]._id});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).friends.should.be.false();
          done();
        });
        reqHandler.checkIfFriends(req, res);
      });
    });
  });

  describe('getFriends', function() {
    describe('check friend when not logged in', function() {
      it('should return 400', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/getFriends'});
        req.session = {};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(strings.notLoggedIn);
          done();
        });
        reqHandler.getFriends(req, res);
      });
    });

    describe('get empty friendslist', function() {
      let user = null;
      before(function(done) {
        dbHandler.registerUser({username: 'userOne', password: 'pw'})
        .then((res) => user = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200 and an empty list', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/getFriends'});
        req.session = {loggedIn: true, _id: user._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).should.eql([]);
          done();
        });
        reqHandler.getFriends(req, res);
      });
    });

    describe('get populated friendslist', function() {
      let users = null;
      before(function(done) {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'}),
          dbHandler.registerUser({username: 'userThree', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => dbHandler.newFriendship(users[0]._id, users[1]._id))
        .then(() => dbHandler.newFriendship(users[2]._id, users[0]._id))
        .then(() => done());
      });

      after(cleanDb);

      it('should return 200 and an empty list', function(done) {
        let req = httpMocks.createRequest({method: 'GET', url:'/getFriends'});
        req.session = {loggedIn: true, _id: users[0]._id};
        let res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          JSON.parse(data).length.should.equal(2);
          done();
        });
        reqHandler.getFriends(req, res);
      });
    });
  });

  after((done) => {dbHandler.close(); done(); } );
});
