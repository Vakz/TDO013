"use strict";

var app = angular.module('socialApplication', ['ngRoute', 'ui.bootstrap', 'socialSiteControllers'])

.config(["$routeProvider", function($routeProvider) {
  $routeProvider.when('/login', {
    templateUrl: 'partials/login.html',
    controller: 'loginController'
  });
}]);
