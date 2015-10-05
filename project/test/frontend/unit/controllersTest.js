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

  describe('AuthController, Login', function() {
    var scope, $httpBackend;

    beforeEach(inject(function($rootScope, $controller, _$httpBackend_, $location) {
      scope = $rootScope.$new();
      $location.path('/#/login');
      scope.loginform = {$valid: true};
      $controller('AuthController', {$scope: scope});
      $httpBackend = _$httpBackend_;
    }));

    it('should get an error', function() {
      inject(function() {
        $httpBackend.expect('POST', /\/login$/).respond(422, {data: 'error'});
        scope.submit({username: 'uname', password: 'short'});
        $httpBackend.flush();
        expect(scope.errors.loginError).toBe(true);
      });
    });

    it('should log in user', function() {
      inject(function($localStorage, $location) {
        $httpBackend.expect('POST', /\/login$/).respond(200, {username: 'uname', _id: 'a'});
        spyOn($location, "path");
        scope.submit({username: 'uname', password: 'longer'});
        $httpBackend.flush();
        expect($localStorage.username).toBe('uname');
        expect($location.path).toHaveBeenCalledWith('/profile');
      });
    });
  });

  /* As register and login use the same controller and work very similarily,
     the only actual differences between them is the location (/register) used.
  */
  describe('AuthController, Login', function() {
    var scope, $httpBackend;

    beforeEach(inject(function($rootScope, $controller, _$httpBackend_, $location) {
      scope = $rootScope.$new();
      $location.path('/#/register');
      scope.loginform = {$valid: true};
      $controller('AuthController', {$scope: scope});
      $httpBackend = _$httpBackend_;
    }));

    it('should get an error', function() {
      inject(function() {
        $httpBackend.expect('POST', /\/register$/).respond(422, {data: 'error'});
        scope.submit({username: 'uname', password: 'short'});
        $httpBackend.flush();
        expect(scope.errors.loginError).toBe(true);
      });
    });

    it('should log in user', function() {
      inject(function($localStorage, $location) {
        $httpBackend.expect('POST', /\/register$/).respond(200, {username: 'uname', _id: 'a'});
        spyOn($location, "path");
        scope.submit({username: 'uname', password: 'longer'});
        $httpBackend.flush();
        expect($localStorage.username).toBe('uname');
        expect($location.path).toHaveBeenCalledWith('/profile');
      });
    });
  });

  describe('TemplateController', function() {
    var scope, $localStorage, controller;

    beforeEach(inject(function($rootScope, $controller, _$localStorage_) {
      $localStorage = _$localStorage_;
      spyOn($localStorage, '$default').and.callThrough();
      scope = $rootScope.$new();
      $controller('TemplateController', {$scope: scope});
    }));

    it('should set up default local storage', function() {
      expect($localStorage.$default).toHaveBeenCalledWith({loggedIn: false});
    });
  });

  describe('ProfileController', function() {
    var scope, $httpBackend, controller;
    beforeEach(inject(function($rootScope, $controller, $routeParams, _$httpBackend_) {
      scope = $rootScope.$new();
      scope.$storage = {_id: 'a'};
      $httpBackend = _$httpBackend_;
      $routeParams.id = 'a';
      controller = $controller('ProfileController', {$scope: scope});
    }));

    it('should set error to "Could not get user"', function() {
      $httpBackend.expect('GET', /\/getProfile/).respond(400, 'Could not get user');
      $httpBackend.flush();
      expect(scope.error).toBe('Could not get user');
    });

    it('should get user and set variables', function() {
      $httpBackend.expect('GET', /\/getProfile/).respond(200, {username: 'uname', messages: []});
      $httpBackend.flush();
      expect(scope.username).toBe('uname');
    });
  });
});
