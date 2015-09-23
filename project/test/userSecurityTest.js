"use strict";
require('should');

let config = require('../lib/config');
let errors = require('../lib/errors');
let UserSecurity = require('../lib/userSecurity');
let bcrypt = require('bcrypt');
let RandExp = require('randexp');

describe('UserSecurity', function() {

  let getPattern = (length) => new RegExp("^[" + config.get('security:sessions:tokenChars') + "]{" + length + "}$");

  // Really just for code coverage
  describe('getSessionOptions', function() {
    it('should return an object with options detailed in config', function() {
      let options = UserSecurity.getSessionOptions();
      options.secret.should.equal(config.get('security:sessions:key'));
      options.duration.should.equal(config.get('security:sessions:sessionDuration'));
      options.activeDuration.should.equal(config.get('security:sessions:activeDuration'));
    });
  });

  describe('generateToken', function() {
    describe('Attempt to create token with zero length', function() {
      it('should return an ArgumentError', function(done) {
        UserSecurity.generateToken(0).then(null, function(err) {
          err.should.be.instanceOf(errors.ArgumentError);
          done();
        })
        .done();
      });
    });

    describe('Attempt to create token with length 10', function() {
      it('should return a valid string of length 10', function(done) {
        UserSecurity.generateToken(10).then(function(val) {
          getPattern(10).test(val).should.be.true();
          done();
        })
        .done();
      });
    });
  });

  describe('hash', function() {
    describe('hash simple password', function() {
      let password = "simplepassword";
      it('should work as expected', function(done) {
        UserSecurity.hash(password)
        .then(function(hash) {
          bcrypt.compare(password, hash, (err, res) => { res.should.be.true(); done(); });
        })
        .done();
      });
    });

    describe("Attempt to hash zero-length password", function() {
      it('should return ArgumentError', function(done) {
        UserSecurity.hash("")
        .then(null, (err) => { err.should.be.instanceOf(errors.ArgumentError); done(); })
        .done();
      });
    });
  });

  describe('verifyHash', function() {
    describe('Verify a hashed password', function() {
      it('should return true', function(done) {
        let pw = "decentpassword";
        UserSecurity.hash(pw)
        .then((hash) => UserSecurity.verifyHash(pw, hash))
        .then((val) => {val.should.be.true(); done(); });
      });
    });

    describe('Attempt to verify zero-length password', function() {
      it('should return ArgumentError', function(done) {
        UserSecurity.verifyHash("")
        .then(null, (err) => { err.should.be.instanceOf(errors.ArgumentError); done(); });
      });
    });
  });


  describe('isValidUsername', function() {
    let maxLength = config.get('users:usernameMaxLength');
    let makePattern = (length) => new RegExp("^[" + config.get('users:acceptableCharacters') + "]{" + length + "}$");

    describe('Check valid username', function() {
      it('should return true', function(done) {
        let pattern = makePattern(maxLength);
        let uname = (new RandExp(pattern)).gen();
        pattern.test(uname).should.be.true();
        UserSecurity.isValidUsername(uname).should.be.true();
        done();
      });
    });

    describe('Check empty username', function() {
      it('should return false', function(done) {
        UserSecurity.isValidUsername("").should.be.false();
        done();
      });
    });

    describe('Check too long username', function() {
      it('should return false', function(done) {
        let pattern = makePattern(maxLength + 1);
        let uname = (new RandExp(pattern)).gen();
        makePattern(maxLength).test(uname).should.be.false();
        UserSecurity.isValidUsername(uname).should.be.false();
        done();
      });

    });

    describe('Check invalid characters', function() {
      it('should return false', function(done) {
        let invalidPattern = new RegExp("^[^(" + config.get('users:acceptableCharacters') + ")]{" + maxLength + "}$");
        let uname = (new RandExp(invalidPattern)).gen();
        makePattern(maxLength).test(uname).should.be.false();
        UserSecurity.isValidUsername(uname).should.be.false();
        done();
      });
    });
  });
});
