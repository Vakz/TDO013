require('should');

var config = require('../lib/config');
var errors = require('../lib/errors');
var userSecurity = require('../lib/userSecurity');

describe('UserSecurity', function() {

  // Really just for code coverage
  describe('getSessionOptions', function() {
    it('should return an object with options detailed in config', function() {
      var options = userSecurity.getSessionOptions();
      options.secret.should.equal(config.get('security:sessions:key'));
      options.duration.should.equal(config.get('security:sessions:sessionDuration'));
      options.activeDuration.should.equal(config.get('security:sessions:activeDuration'));
    });
  });
});
