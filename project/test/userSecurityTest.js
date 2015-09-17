require('should');

var config = require('../lib/config');
var errors = require('../lib/errors');
var UserSecurity = require('../lib/userSecurity');

describe('UserSecurity', function() {

  // Really just for code coverage
  describe('getSessionOptions', function() {
    it('should return an object with options detailed in config', function() {
      var options = UserSecurity.getSessionOptions();
      options.secret.should.equal(config.get('security:sessions:key'));
      options.duration.should.equal(config.get('security:sessions:sessionDuration'));
      options.activeDuration.should.equal(config.get('security:sessions:activeDuration'));
    });
  });

  describe('generateToken', function() {
    describe('Attempt to create token with zero length', function() {
      it('should return an error', function(done) {
        UserSecurity.generateToken(0).then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        }).done();
      });
    });

    describe('Attempt to create token with length 10', function() {
      it('should return a valid string of length 10', function(done) {
        UserSecurity.generateToken(10).then(function(val) {
          /^[\w\d]{10}$/.test(val).should.be.true();
          done();
        }).done();
      });
    });
  });
});
