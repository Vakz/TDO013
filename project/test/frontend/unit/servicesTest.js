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

  describe('ProfileService', function() {
    var $httpBackend, ProfileService;
    beforeEach(inject(function(_$httpBackend_, _ProfileService_) {
      $httpBackend = _$httpBackend_;
      ProfileService = _ProfileService_;
    }));

    it('should return an Error', function(done) {
      $httpBackend.expect('GET', /\/getProfile/)
      .respond(400, 'User does not exist');
      ProfileService.getProfile('a')
      .then(null, function(err) {
        expect(err instanceof Error).toBe(true);
        done();
      });
      $httpBackend.flush();
    });

    it('should return username, id and array of messages', function(done) {
      $httpBackend.expect('GET', /\/getProfile/)
      .respond(200, {username: 'uname', _id: 'a', messages: []});
      ProfileService.getProfile('a')
      .then(function(res) {
        expect(res.username).toBe('uname');
        expect(res._id).toBe('a');
        expect(res.messages).toEqual([]);
        done();
      });
      $httpBackend.flush();
    });
  });
});
