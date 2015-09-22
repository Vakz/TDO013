process.env['database:db'] = 'social_website_test';
process.env.NODE_ENV = 'test';
require('should');
var Q = require('q');

var config = require('../lib/config');
var DatabaseHandler = require('../lib/databaseHandler');
var RequestHandler = require('../lib/requestHandler');
var httpMocks = require('node-mocks-http');
var ArgumentError = require('../lib/errors').ArgumentError;
var DatabaseError = require('../lib/errors').DatabaseError;
var UserSecurity = require('../lib/userSecurity');
var sessions = require('client-sessions');

var setupResponse = function(done) {
  var response = httpMocks.createResponse(
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
  var reqHandler = new RequestHandler();
  var dbHandler = new DatabaseHandler();
  var helper = require('./helper');
  var sessionHandler = sessions(UserSecurity.getSessionOptions());

  var cleanDb = function(done) {
    helper.cleanDb()
    .then(done);
  };

  before(function(done) {
    var pattern = /_test$/;
    if (!pattern.test(config.get('database:db'))) {
      console.error("DB used for testing should end with '_test'");
      process.exit(1);
    }
    helper.start()
    .then(dbHandler.connect)
    .then(reqHandler.connect)
    .then(() => done())
    .done();
  });

  describe('errorHandler', function() {
    describe('Test ArgumentError', function() {
      it('should return 400 and the error message', function(done) {
        var message = "Generic error message";
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          data.should.equal(message);
          done();
        });
        RequestHandler._private.errorHandler(res, new ArgumentError(message));
      });
    });

    describe('Test DatabaseError', function() {
      it('should return 503 and the error message', function(done) {
        var message = "Generic database error message";
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(503);
          data.should.equal(message);
          done();
        });
        RequestHandler._private.errorHandler(res, new DatabaseError(message));
      });
    });

    describe('Test generic error', function() {
      it('should return 500', function(done) {
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(500);
          done();
        });
        RequestHandler._private.errorHandler(res, new Error());
      });
    });
  });

  describe('getUsersById', function() {
    var users = null;
    describe('Make a valid request', function() {
      before(function() {
        Q.all([
          dbHandler.registerUser({username: 'userOne', password: 'pw'}),
          dbHandler.registerUser({username: 'userTwo', password: 'pw'})
        ])
        .then((res) => users = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should return the usernames of the two users', function(done) {
        var ids = [users[0]._id, users[1]._id];
        var req = httpMocks.createRequest({'url': '/getUsersById?ids=' + JSON.stringify(ids)});
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          res.getHeader('Content-Type').should.equal('application/json');
          var expectedData = [
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
        var ids = ['a', 'b'];
        var req = httpMocks.createRequest({'url': '/getUsersById?ids=' + JSON.stringify(ids)});
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getUsersById(req, res);
      });
    });

    describe('Make request with non-array', function() {
      it('should return 400', function(done) {
        var ids = 'a';
        var req = httpMocks.createRequest({'url': '/getUsersById?ids=' + JSON.stringify(ids)});
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        reqHandler.getUsersById(req, res);
      });
    });

    describe('Make request without parameter', function() {
      it('should return 400', function(done) {
        var req = httpMocks.createRequest({'url': '/getUsersById'});
        var res = setupResponse(function(data) {
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
        var req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'uname', password: 'decentpassword'}});

        var res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
          done();
        });
        req.session = {};
        reqHandler.register(req, res);
      });
    });

    describe('register with too short password', function() {
      it('should return 400', function(done) {
        var req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'uname', password: 'short'}});

        var res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });
        req.session = {};
        reqHandler.register(req, res);
      });
    });

    describe('register with missing parameters', function() {
      it('should return 400', function(done) {
        var req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'uname'}});

        var res = setupResponse(function(data) {
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
        var req = httpMocks.createRequest({method: 'POST', url: '/register',
        body: {username: 'usname', password: 'decentpassword'}});

        var res = setupResponse(function(data) {
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
        var req = httpMocks.createRequest({method: 'POST', url: '/login',
        body: {username: 'usname', password: 'decentpassword'}});

        var res = setupResponse(function(data) {
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
        var req = httpMocks.createRequest({method: 'POST', url: '/login',
        body: {username: 'usname', password: UserSecurity.hash('decentpassword')}});

        var res = setupResponse(function(data) {
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

      it('should return 522', function(done) {
        var req = httpMocks.createRequest({method: 'POST', url: '/login',
        body: {username: 'usname', password: 'incorrect'}});

        var res = setupResponse(function(data) {
          res.statusCode.should.equal(422);
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
        var req = httpMocks.createRequest({method: 'POST', url: '/logout'});
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(200);
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
        var req = httpMocks.createRequest({method: 'POST', url: '/logout'});
        var res = setupResponse(function(data) {
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
        var req = httpMocks.createRequest({method: 'PUT', url: '/resetSessions'});
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(400);
          done();
        });

        sessionHandler(req, res, function() {
          reqHandler.resetSessions(req, res);
        });
      });
    });

    describe('reset valid user', function() {
      var user = null;
      before(function(done) {
        UserSecurity.hash('decentpassword')
        .then((pw) => dbHandler.registerUser({username: 'usname', password: pw}))
        .then((res) => user = res)
        .then(() => done());
      });

      after(cleanDb);

      it('should create a new token and make the old one invalid', function(done) {
        var req = httpMocks.createRequest({method: 'PUT', url: '/resetSessions'});
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(200);

          var reqLogin = httpMocks.createRequest({method: 'POST', url: '/login',
          body: {username: 'usname', password: 'decentpassword'}});

          var resLogin = setupResponse(function(data) {
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
  after((done) => {reqHandler.close(); done(); } );
});
