"use strict";
angular.module('socialSiteControllers', ['ngStorage', 'ngMessages'])
.controller('templateController', ["$scope", "$localStorage", function($scope, $localStorage) {
  $localStorage.$reset();
  $scope.$storage = $localStorage.$default({});
}])
.controller('DropdownCtrl', ["$scope", function($scope) {
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
}])
.controller('loginController', ['$scope', '$location', '$localStorage', 'authService', function($scope, $location, $localStorage, authService) {
  $scope.errors = {};
  $scope.error = "";
  $scope.submit = function(user) {
    if ($scope.loginform.$valid) {
      authService.login(user.username, user.password)
      .then(function(res) {
        $localStorage.loggedIn = true;
        $localStorage.username = res.data.username;
        $localStorage._id = res.data._id;
        $location.path('/profile');
      }, function(err) {
        $scope.error = err.data;
        $scope.errors.loginError = true;
      });
    }
  };
}]);
