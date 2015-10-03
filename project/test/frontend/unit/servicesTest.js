"use strict";

describe('Services', function() {
  beforeEach(module('socialApplication'));

  describe('authService', function() {
    var $httpBackend, authService;

    beforeEach(inject(function(_$httpBackend_, _authService_) {
      $httpBackend = _$httpBackend_;
      authService = _authService_;
    }));

    it('should return error', function(done) {
      $httpBackend.expect('POST', /\/login$/)
      .respond(422, 'error');
      authService.login({username: 'uname', password: 'short'})
      .then(null, function(err) {
        expect(err.data).toBe('error');
        done();
      });
      $httpBackend.flush();
    });

    it('should be valid', function(done) {
      $httpBackend.expect('POST', /\/login$/)
      .respond(200, {username: 'uname', _id: 'a'});
      authService.login({username: 'uname', password: 'short'})
      .then(function(res) {
        expect(res.data.username).toBe('uname');
        done();
      });
      $httpBackend.flush();
    });
  });
});
