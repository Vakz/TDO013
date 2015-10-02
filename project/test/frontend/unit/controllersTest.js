"use strict";

describe('Controllers', function() {
  beforeEach(module('socialApplication'));

  beforeEach(function() {
    module(function($provide) {
      $provide.service('authService', function($q) {
        return {
          login: function(uname, pw) {
            return $q(function(resolve, reject) {
              if (pw.length >= 6) resolve({status:200, data: {username: 'uname', _id: 'aaa'}});
              else reject({data: 'Password too short'});
            });
          }
        };
      });
    });


  });

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
    var scope;

    beforeEach(inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      scope.loginform = {$valid: true};
      $controller('LoginController', {$scope: scope});
    }));

    it('should get an error', function(done) {
      inject(function($timeout) {
        spyOn(scope, 'submit').and.callThrough();
        scope.submit({username: 'uname', password: 'short'});
        // Need to give submit time to resolve
        $timeout(function() {
          expect(scope.errors.loginError).toBe(true);
          done();
        }, 0);
        $timeout.flush();
      });
    });

    it('should log in user', function(done) {
      inject(function($timeout, $localStorage) {
        scope.submit({username: 'uname', password: 'longer'});
        // Need to give submit time to resolve
        $timeout(function() {
          expect($localStorage.loggedIn).toBe(true);
          expect($localStorage.username).toBe('uname');
          done();
        }, 0);
        $timeout.flush();
      });
    });
  });
});
