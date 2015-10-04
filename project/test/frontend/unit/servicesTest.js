"use strict";

describe('Services', function() {
  beforeEach(module('socialApplication'));

  describe('AuthService', function() {
    var $httpBackend, AuthService;

    beforeEach(inject(function(_$httpBackend_, _AuthService_) {
      $httpBackend = _$httpBackend_;
      AuthService = _AuthService_;
    }));

    it('should return error', function(done) {
      $httpBackend.expect('POST', /\/login$/)
      .respond(422, 'error');
      AuthService.login({username: 'uname', password: 'short'})
      .then(null, function(err) {
        expect(err.data).toBe('error');
        done();
      });
      $httpBackend.flush();
    });

    it('should be valid', function(done) {
      $httpBackend.expect('POST', /\/login$/)
      .respond(200, {username: 'uname', _id: 'a'});
      AuthService.login({username: 'uname', password: 'short'})
      .then(function(res) {
        expect(res.data.username).toBe('uname');
        done();
      });
      $httpBackend.flush();
    });
  });

  describe('MessageService', function() {

  });
});
