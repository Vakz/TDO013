"use strict";

angular.module('socialSiteControllers', ['ngStorage'])
.controller('templateController', ["$scope", "$localStorage", function($scope, $localStorage) {
  $localStorage.$reset();
  $scope.$storage = $localStorage.$default({username: 'hello', loggedIn: true});
}])
.controller('DropdownCtrl', function($scope) {
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
