angular.module("socialApplication")
.service('AuthService', ['$http', '$q', function($http, $q) {
  var getAuthobject = (destination, uname, pw) =>
  { return {
    method: 'POST',
    url:   destination,
    data: { 'password': pw, 'username': uname},
    headers: { 'Content-Type': 'application/json' }
  }; };
  var logout = function() {
    return $http({
      method: 'POST',
      url: 'logout'
    });
  };
  var changePassword = function(password, reset) {
    return $http({
      method: 'PUT',
      url: 'updatePassword',
      data: {password: password, reset: reset}
    });
  };
  var resetSessions = function(id) {
    return $http({
      method: 'PUT',
      url:   'resetSessions'
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
.service('UserService', ['$http', '$q', function($http, $q) {
  var getUsernamesById = function(ids) {
    return $http({
      method: 'GET',
      url: 'getUsersById',
      params: {ids: JSON.stringify(ids)}
    });
  };
  var search = function(searchstring) {
    return $http({
      method: 'GET',
      url: 'search',
      params: {searchword: searchstring}
    });
  };
  return { getUsernamesById: getUsernamesById, search: search };
}])
.service('ProfileService', ['$rootScope', '$http', '$q', 'UserService',
function($rootScope, $http, $q, UserService) {
  var getProfile = function(id) {
    return $q(function(resolve, reject) {
      var profile;

      var getMessageSenderIDs = function(result) {
        var ids = new Set();
        profile = result.data;
        profile.messages.forEach((message) => ids.add(message.from));
        // No need calling server if no ids to retrieve
        if (ids.size !== 0) return UserService.getUsernamesById(Array.from(ids));
        return { data: [] };
      };

      var parseNames = function(users) {
        profile.users = new Map();
        users.data.forEach((user) => profile.users.set(user._id, user.username));
        return profile;
      };

      $http({
        method: 'GET',
        url: 'getProfile',
        params: {id: id}
      })
      .then(getMessageSenderIDs)
      .then(parseNames)
      .then(resolve)
      .catch(function(err) {
        if(err.status === 403) $rootScope.$broadcast('UnexpectedLoggedOut');
        reject(new Error(err.data));
      });
    });
  };
  var getUserById = function(id) {
    return $http({
      method: 'GET',
      url:   'getUserById',
      params: {id: id}
    });
  };
  return { getProfile: getProfile };
}])
.service('MessageService', ['$http', function($http) {
  var sendMessage = function(to, message) {
    return $http({
      method: 'POST',
      url: 'sendMessage',
      data: {receiver: to, message: message},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  var removeMessage = function(id) {
    return $http({
      method: "DELETE",
      url: "deleteMessage",
      data: {messageId: id},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  var getMessages = function(id, after) {
    return $http({
      method: 'GET',
      url: 'getMessages',
      params: {id: id, after: (after || 0)}
    });
  };
  return {
    sendMessage: sendMessage,
    removeMessage: removeMessage,
    getMessages: getMessages
  };
}])
.service('FriendService', ['$http', function($http) {
  var unfriend = function(id) {
    return $http({
      method: 'DELETE',
      url: "unfriend",
      data: {friendId: id},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  var addFriend = function(id) {
    return $http({
      method: 'POST',
      url: 'addFriend',
      data: {friendId: id},
      headers: { 'Content-Type': 'application/json' }
    });
  };
  var getFriends = function() {
    return $http({
      method: 'GET',
      url: 'getFriends',
    });
  };
  return {
    unfriend: unfriend,
    addFriend: addFriend,
    getFriends: getFriends
  };
}])
.service('ChatService', ['$rootScope', '$localStorage', function($rootScope, $localStorage) {
  var socket = null;
  var active = null;
  var isRunning = false;
  var chats = new Map();

  var start = function() {
    if (isRunning) return;
    socket = io(':45556', {'force new connection': true});
    isRunning = true;
    socket.on('chatmessage', function(message) {
      // If message.fromId is same as the one stored in localStorage, we are receiving
      // our copy of a message we sent ourselves
      var id = message.fromId;
      var username = message.fromUsername;
      if (message.fromId === $localStorage._id) {
        id = message.toId;
        username = message.toUsername;
      }
      if(!chats.has(id)) {
        newChat(id, username);
      }
      chats.get(id).messages.push(message);
      $rootScope.$digest();
    });
  };

  var newChat = function(id, username) {
    if (!chats.has(id)) {
      chats.set(id, {username: username, messages: []});
      $rootScope.$broadcast('newChat', id, username);
    }
    setActive(id, username);
  };

  var getActiveChats = function() {
    var users = [];
    for (var entry of chats.entries()) {
      users.push({username: entry[1].username, id: entry[0]});
    }
    return users;
  };

  var getActive = function() {
    return active;
  };

  var getActiveChat = () => chats.get(active.id);

  var send = function(message) {
    if (active) socket.emit('chatmessage', {_id: active.id, message: message});
  };

  var setActive = function(id, username) {
    if (!active || active.id !== id) {
      active = {id: id, username: username};
      $rootScope.$broadcast('activeChanged', active);
    }
  };

  $rootScope.$on('logout', function() {
    socket.close();
    socket = null;
    active = null;
    isRunning = false;
    chats.clear();
    $rootScope.$broadcast('chatReset');
  });

  return {
    start: start,
    getActiveChats: getActiveChats,
    setActive: setActive,
    newChat: newChat,
    getActive: getActive,
    getActiveChat: getActiveChat,
    send: send
  };
}])
.service('ProfileWatchService', ['$rootScope', function($rootScope) {
  var profileWatcher = null;

  var terminate = function() {
    if (profileWatcher) profileWatcher.terminate();
    profileWatcher = null;
  };

  var start = function() {
    if(!profileWatcher) profileWatcher = new Worker('js/watcher.js');
    profileWatcher.onmessage = function(message) {
      $rootScope.$broadcast('NewProfileMessage', message.data);
    };

    $rootScope.$on('ProfileChanged', function(event, id) {
      if (profileWatcher !== null) profileWatcher.postMessage({type: 'set', id: id});
    });

    $rootScope.$on('DisableProfileWatch', function() {
      if (profileWatcher !== null) profileWatcher.postMessage({type: 'stop'});
    });

    $rootScope.$on('logout', function() {
      terminate();
    });
  };

  return {start: start};
}])
.service('ImageService', ['$http', function($http) {
  return {
    getImages: (id) => $http({
      method: 'GET',
      url: '/getImages',
      params: { id: id }
    })
  };
}]);
