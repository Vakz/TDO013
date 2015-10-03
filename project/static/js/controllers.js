"use strict";
angular.module('socialSiteControllers', ['ngStorage', 'ngMessages'])
.controller('templateController', ["$scope", "$localStorage", function($scope, $localStorage) {
  $scope.$storage = $localStorage.$default({loggedIn: false});
}])
.controller('DropdownCtrl', ["$scope", "authService", "$location", function($scope, authService, $location) {
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

  $scope.logout = function() {
    console.log("here");
    authService.logout()
    .then(() => $scope.$storage.$reset())
    .then(() => $location.path('/login'));
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

}])
.controller('ProfileController', function() {

});
