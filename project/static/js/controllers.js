"use strict";
angular.module('socialSiteControllers', ['ngStorage', 'ngMessages'])
.controller('templateController', ["$scope", "$localStorage", function($scope, $localStorage) {
  $scope.$storage = $localStorage.$default({loggedIn: false});
}])
.controller('DropdownCtrl', ["$scope", "AuthService", "$location", function($scope, AuthService, $location) {
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
    AuthService.logout()
    .then(() => $scope.$storage.$reset())
    .then(() => $location.path('/login'));
  };
}])
.controller('AuthController', ['$scope', '$location', '$localStorage', 'AuthService',
  function($scope, $location, $localStorage, AuthService) {
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
        if ($scope.login) authcall = AuthService.login(user.username, user.password);
        else authcall = AuthService.register(user.username, user.password);
        authcall.then(function(res) {
          angular.extend($localStorage, res.data, {loggedIn: true});
          $location.path('/profile');
        }, function(err) {
          $scope.error = err.data;
          $scope.errors.loginError = true;
          $scope.pending = false;
        });
      }
    };

}])
.controller('ProfileController', ['$scope', '$routeParams', 'ProfileService', function($scope, $routeParams, ProfileService) {
  $scope.id = $routeParams.id || $scope.$storage._id;
  console.log($scope.id);
  ProfileService.getProfile($scope.id)
  .then(function(profile) {
    console.log(profile);
    $scope.username = profile.username;
  });
}])
.controller('MessageController', ['$scope', function() {

}]);
