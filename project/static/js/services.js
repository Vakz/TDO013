angular.module("socialApplication")

.service('authService', ['$http', '$q', function($http, $q) {
  var baseUrl = 'http://localhost:45555/';
  var getAuthobject = (destination, uname, pw) => { return {
    method: 'POST',
    url: baseUrl + "login",
    data: { 'password': pw, 'username': uname},
    headers: { 'Content-Type': 'application/json' }
  }; };
  var logout = function() {
    return $http({
      method: 'POST',
      url: baseUrl + 'logout'
    });
  };
  return {
    login: (username, password) => $http(getAuthobject('login', username, password)),
    register: (username, password) => $http(getAuthobject('register', username, password)),
    logout: logout
  };
}]);
