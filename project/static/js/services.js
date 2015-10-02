angular.module("socialApplication")

.service('authService', ['$http', '$q', function($http, $q) {
  var baseUrl = 'http://localhost:45555/';

  var login = function(username, password) {
    return $http(
      {
        method: 'POST',
        url: baseUrl + "login",
        data: { 'password': password, 'username': username},
        headers: { 'Content-Type': 'application/json' }
    });
  };
  return {login: login};
}]);
