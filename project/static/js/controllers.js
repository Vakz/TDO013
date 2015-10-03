"use strict";
angular.module('socialSiteControllers', ['ngStorage', 'ngMessages'])
.controller('templateController', ["$scope", "$localStorage", function($scope, $localStorage) {
  $scope.$storage = $localStorage.$default({loggedIn: false});
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
.controller('AuthController', ['$scope', '$location', '$localStorage', 'authService',
  function($scope, $location, $localStorage, authService) {
    $scope.login = /\/login$/.test($location.path());
    angular.extend($scope, {
      pattern: /[\w\d._]+/,
      errors: {},
      error: "",
      pending: false
    });
    $scope.submit = function(user) {
      if (!$scope.pending && $scope.loginform.$valid) {
        $scope.pending = true;
        var authcall = null;
        if ($scope.login) authcall = authService.login(user.username, user.password);
        else authcall = authService.register(user.username, user.password);
        authcall.then(function(res) {
          angular.extend($localStorage, res.data, {loggedIn: true});
          $location.path('/profile');
        }, function(err) {
          $scope.error = err.data;
          $scope.errors.loginError = true;
        })
        .finally(() => $scope.pending = false);
      }
    };
}]);
