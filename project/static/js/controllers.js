"use strict";
angular.module('socialSiteControllers', ['ngStorage', 'ngMessages'])
.controller('TemplateController', ["$scope", "$localStorage", "$modal", "UserService", '$location',
function($scope, $localStorage, $modal, UserService, $location) {
  $scope.$storage = $localStorage.$default({loggedIn: false});

  $scope.open = function() {
    var modalInstance = $modal.open({
      templateUrl: 'partials/options.html',
      controller: 'OptionsController',
      size: 'sm'
    });
  };

  $scope.search = function($viewValue) {
    return UserService.search($viewValue)
    .then(function(res) {
      return res.data;
    });
  };

  $scope.onSelect = function($item) {
    $location.path('/profile/' + $item._id);
  };
}])
.controller('DropdownCtrl', ["$rootScope", "$scope", "AuthService", "$location", function($rootScope, $scope, AuthService, $location) {
  $scope.status = {
    isopen: false
  };

  $scope.toggleDropdown = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.status.isopen = !$scope.status.isopen;
  };

  $scope.logout = function() {
    AuthService.logout()
    .then(() => $rootScope.$broadcast('logout'))
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
      if (!$scope.pending) {
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
.controller('ProfileController', ['$scope', '$route', '$routeParams', 'ProfileService', 'UserService', 'FriendService', 'ChatService',
function($scope, $route, $routeParams, ProfileService, UserService, FriendService, ChatService) {
  angular.extend($scope, {
    isFriend: false,
    error: "",
    id: $routeParams.id || $scope.$storage._id,
  });
  $scope.ownProfile = $scope.id === $scope.$storage._id;
  ProfileService.getProfile($scope.id)
  .then(function(profile) {
    $scope.isFriend = true;
    angular.extend($scope, profile);
    if ($scope.ownProfile) {
      FriendService.getFriends()
      .then(function(users) {
        $scope.friends = users.data;
      });
    }
  },
  function(err) {
    UserService.getUsernamesById([$scope.id])
    .then(function(user) {
      if(user.data.length > 0) angular.extend($scope, user.data[0]);
      else $scope.error = "No user with that id";
    });
  });

  $scope.startChat = function() {
    ChatService.newChat($scope._id, $scope.username);
  };

  $scope.manageFriend = function() {
    if ($scope.isFriend) FriendService.unfriend($scope.id);
    else FriendService.addFriend($scope.id);
    $route.reload();
  };
}])
.controller('MessageController', ['$scope', 'MessageService', function($scope, MessageService) {
  $scope.pending = false;
  $scope.submit = function(message) {
    $scope.errors = {};
    if(!$scope.pending) {
      $scope.pending = true;
      MessageService.sendMessage($scope.id, $scope.messagebox)
      .then(function(res) {
        if (!$scope.users.has($scope.$storage._id)) $scope.users.set($scope.$storage._id, $scope.$storage.username);
        $scope.errors.messageError = false;
        $scope.messages.push(res.data);
        $scope.messagebox = null;
        $scope.messageform.$setPristine();
      },
      function(err) {
        $scope.errors.messageError = true;
        $scope.error = err.data;
      })
      .finally(function() {
        $scope.pending = false;
      });
    }
  };
  $scope.remove = function(id) {
    MessageService.removeMessage(id)
    .then(function() {
      $scope.messages.splice($scope.messages.indexOf((m) => m._id === id), 1);
    });
  };
}])
.controller('MessagePreviewController', ['$scope', function($scope) {
  $scope.message = {
    from: $scope.$storage._id,
    users: new Map([[$scope.from, $scope.$storage.username]]),
    message: $scope.messagebox,
    time: Date.now()
  };
  $scope.$watch('messagebox', function() {
    $scope.message.message = $scope.messagebox;
  });
}])
.controller('OptionsController', ['$scope', 'AuthService',  '$modalInstance', '$localStorage', "$location",
function($scope, AuthService, $modalInstance, $localStorage, $location) {
  $scope.pending = false;
  $scope.message = "";
  var reset = function() {
    $localStorage.$reset();
    $location.path('/login');
    $modalInstance.close();
  };
  $scope.submit = function() {
    if ($scope.password !== $scope.verifyPassword) {
      $scope.message = "Passwords are not identical";
    }
    else if(!$scope.pending) {
      $scope.message = "";
      $scope.pending = true;
      AuthService.changePassword($scope.password, $scope.reset)
      .then(function(res) {
        if ($scope.reset) reset();
        else $scope.message = "Password changed!";
      },
      function(err) {
        $scope.message = err.data;
      })
      .finally(() => $scope.pending = false);
    }
  };
  $scope.resetSessions = function() {
    AuthService.resetSessions()
    .then(reset);
  };
}])
.controller('ChatController', ['$scope', '$rootScope', 'ChatService', function($scope, $rootScope, ChatService) {
  $scope.openChats = [];
  $scope.active = null;
  $scope.chat = [];

  $rootScope.$on('newChat', function($event, id, username) {
    $scope.openChats = ChatService.getActiveChats();
    ChatService.setActive(id, username);
  });

  $rootScope.$on('activeChanged', function($event) {
    $scope.active = ChatService.getActive();
    $scope.chat = ChatService.getActiveChat().messages;
  });

  $rootScope.$on('chatReset', function() {
    $scope.openChats =  [];
    $scope.active = null;
    $scope.chat = [];
  });

  $scope.send = function() {
    ChatService.send($scope.chatinput);
  };

  $scope.toggleDropdown = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
  };

  $scope.setActive = function(chat) {
    ChatService.setActive(chat.id, chat.username);
  };
}]);
