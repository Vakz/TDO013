process.env['database:db'] = 'social_website_test';
require('should');
var Q = require('q');

var config = require('../lib/config');
var DatabaseHandler = require('../lib/databaseHandler');
var RequestHandler = require('../lib/requestHandler')
var errors = require('../lib/errors');
var httpMocks = require('node-mocks-http');

var setupResponse = function(done) {
  var response = httpMocks.createResponse(
    {'eventEmitter': require('events').EventEmitter,
     'writableStream': require('stream').Writable });
  response.setEncoding('utf8');

  response.on('error', function(err) {
    throw new Error(err);
  })

  response.on('end', function(data) {
    done(response._getData())
  });
  return response;
};

describe('RequestHandler', function() {
  var reqHandler = new RequestHandler();
  var dbHandler = new DatabaseHandler();
  var helper = require('./helper');

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
      })

      after(cleanDb);

      it('should return the usernames of the two users', function(done) {
        var ids = [users[0]._id, users[1]._id];
        var req = httpMocks.createRequest({'url': '/getUsersById?ids=' + JSON.stringify(ids)});
        var res = setupResponse(function(data) {
          res.statusCode.should.equal(200)
          res.getHeader('Content-Type').should.equal('application/json');
          var expected_data = {};
          expected_data[users[0]._id] = users[0].username;
          expected_data[users[1]._id] = users[1].username;
          JSON.parse(data).should.eql(expected_data);
          done();
        })
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
      })
    });
  });

  after((done) => {reqHandler.close(); done(); } )
});
