angular.module("socialApplication")
.constant('BaseURL', 'http://localhost:45555/')
.service('AuthService', ['$http', '$q', 'BaseURL', function($http, $q, BaseURL) {
  var getAuthobject = (destination, uname, pw) =>
  { return {
    method: 'POST',
    url: BaseURL + destination,
    data: { 'password': pw, 'username': uname},
    headers: { 'Content-Type': 'application/json' }
  }; };
  var logout = function() {
    return $http({
      method: 'POST',
      url: BaseURL + 'logout'
    });
  };
  return {
    login: (username, password) => $http(getAuthobject('login', username, password)),
    register: (username, password) => $http(getAuthobject('register', username, password)),
    logout: logout
  };
}])
.service('UserService', ['$http', '$q', 'BaseURL', function($http, $q, BaseURL) {
  var getUsernamesById = function(ids) {
    return $http({
      method: 'GET',
      url: BaseURL + 'getUsersById',
      params: {ids: JSON.stringify(ids)}
    });
  };
  return { getUsernamesById: getUsernamesById };
}])
.service('ProfileService', ['$http', '$q', 'BaseURL', 'UserService', function($http, $q, BaseURL, UserService) {
  var getProfile = function(id) {
    return $q(function(resolve, reject) {
      var profile;
      $http({
        method: 'GET',
        url: BaseURL + 'getProfile',
        params: {id: id}
      })
      .then(function(result) {
        var ids = new Set();
        profile = result.data;
        profile.messages.forEach(function(message) {
          ids.add(message.from);
        });

        return UserService.getUsernamesById(Array.from(ids));
      })
      .then(function(users) {
        profile.users = new Map();
        users.data.forEach(function(user) {
          profile.users.set(user._id, user.username);
        });
        resolve(profile);
      })
      .catch(reject);
    });
  };
  return { getProfile: getProfile };
}])
.service('MessageService', ['$http', 'BaseURL', function($http, BaseURL) {
  var sendMessage = function(to, message) {
    return $http({
      method: 'POST',
      url: BaseURL + 'sendMessage',
      data: {receiver: to, message: message},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  var removeMessage = function(id) {
    return $http({
      method: "DELETE",
      url: BaseURL + "deleteMessage",
      data: {messageId: id},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  return {sendMessage: sendMessage, removeMessage: removeMessage};
}]);
