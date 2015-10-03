"use strict";

var app = angular.module('socialApplication', ['ngRoute', 'ui.bootstrap', 'socialSiteControllers'])

.config(["$routeProvider", function($routeProvider) {
  $routeProvider
  .when('/login', {
    templateUrl: 'partials/auth.html',
    controller: 'AuthController'
  })
  .when('/register', {
    templateUrl: 'partials/auth.html',
    controller: 'AuthController'
  })
  .when('/logout', {
    templateUrl: 'partials/auth.html',
    controller: 'AuthController'
  })
  .otherwise('/profile');
}]).run(['$localStorage', '$location', '$rootScope', 'authService', function($localStorage, $location, $rootScope, authService) {
  $rootScope.$on('$routeChangeStart', function(e, next, current) {
    if (!/\/(login|register)/.test($location.path()) && !$localStorage.loggedIn) {
      e.preventDefault();
      $location.path('/login');
    }
    else if (/\/(login|regiser)/.test($location.path()) && $localStorage.loggedIn) {
      e.preventDefault();
      $location.path('/profile');
    }
    else if (/\/logout/.test($location.path())) {
      e.preventDefault();
      authService.logout()
      .then(() => $localStorage.$reset())
      .then(() => $location.path('/login'));
    }
  });
}]);
