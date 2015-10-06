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
  var changePassword = function(password, reset) {
    return $http({
      method: 'PUT',
      url: BaseURL + 'updatePassword',
      data: {password: password, reset: reset}
    });
  };
  var resetSessions = function(id) {
    return $http({
      method: 'PUT',
      url: BaseURL + 'resetSessions'
    });
  };
  return {
    login: (username, password) => $http(getAuthobject('login', username, password)),
    register: (username, password) => $http(getAuthobject('register', username, password)),
    logout: logout,
    changePassword: changePassword,
    resetSessions: resetSessions
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
  var search = function(searchstring) {
    return $http({
      method: 'GET',
      url: BaseURL + 'search',
      params: {searchword: searchstring}
    });
  };
  return { getUsernamesById: getUsernamesById, search: search };
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
        // No need calling server if no ids to retrieve
        if (ids.size !== 0) {
          return UserService.getUsernamesById(Array.from(ids));
        }
        return { data: [] };
      })
      .then(function(users) {
        profile.users = new Map();
        users.data.forEach(function(user) {
          profile.users.set(user._id, user.username);
        });
        resolve(profile);
      })
      .catch(function(err) {
        reject(new Error(err.data));
      });
    });
  };
  var getUserById = function(id) {
    return $http({
      method: 'GET',
      url: BaseURL + 'getUserById',
      params: {id: id}
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
}])
.service('FriendService', ['$http', 'BaseURL',function($http, BaseURL) {
  var unfriend = function(id) {
    return $http({
      method: 'DELETE',
      url: BaseURL + "unfriend",
      data: {friendId: id},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  var addFriend = function(id) {
    return $http({
      method: 'POST',
      url: BaseURL + 'addFriend',
      data: {friendId: id},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  var getFriends = function() {
    return $http({
      method: 'GET',
      url: BaseURL + 'getFriends',
    });
  };
  return {unfriend: unfriend, addFriend: addFriend, getFriends: getFriends};
}]);
