"use strict";

describe('Controllers', function() {
  beforeEach(module('socialApplication'));

  describe('DropdownCtrl', function() {
    var scope;
    var event = {
      preventDefault: function(){},
      stopPropagation: function(){}};
    beforeEach(inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');
      $controller('DropdownCtrl', {$scope: scope});
    }));

    it('should toggle', function() {
      expect(scope.status.isopen).toBe(false);
      scope.toggleDropdown(event);
      expect(scope.status.isopen).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('LoginController', function() {
    var scope, $httpBackend;

    beforeEach(inject(function($rootScope, $controller, _$httpBackend_, $location) {
      scope = $rootScope.$new();
      $location.path('/#/login');
      scope.loginform = {$valid: true};
      $controller('AuthController', {$scope: scope});
      $httpBackend = _$httpBackend_;
    }));

    it('should get an error', function() {
      inject(function($timeout) {
        $httpBackend.expect('POST', /\/login$/).respond(422, {data: 'error'});
        scope.submit({username: 'uname', password: 'short'});
        $httpBackend.flush();
        expect(scope.errors.loginError).toBe(true);
      });
    });

    it('should log in user', function() {
      inject(function($timeout, $localStorage, $location) {
        $httpBackend.expect('POST', /\/login$/).respond(200, {username: 'uname', _id: 'a'});
        spyOn($location, "path");
        scope.submit({username: 'uname', password: 'longer'});
        $httpBackend.flush();
        expect($localStorage.username).toBe('uname');
        expect($location.path).toHaveBeenCalledWith('/profile');
      });
    });
  });
});
