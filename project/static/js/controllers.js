"use strict";

var app = angular.module('socialSiteControllers', ['ngStorage']);

app.controller('templateController', ["$scope", "$localStorage", function($scope, $localStorage) {
  $localStorage.$reset();
  $scope.$storage = $localStorage.$default({loggedIn: true});
  $scope.username = $scope.$storage.username || 'Not logged in';
  $scope._id = $scope.$storage._id || '#/login';
  $scope.loggedIn = $scope.$storage.loggedIn || false;
}]);

app.controller('DropdownCtrl', function($scope) {
  $scope.status = {
    isopen: false
  };

  $scope.toggled = function(open) {

  };

  $scope.toggleDropdown = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.status.isopen = !$scope.status.isopen;
  };
});
