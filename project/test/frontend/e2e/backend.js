module.exports = function() {
  angular.module('httpBackendMock', ['socialApplication', 'ngMockE2E'])
  .run(['$httpBackend', function($httpBackend) {
    $httpBackend.when('POST', /register/).respond(function(method, url, data) {
      data = JSON.parse(data);
      if (data.username === 'uname' && data.password === 'hellothere') {
        return [200, {_id: 'aaa', username: data.username}];
      }
      return [422];
    });
    $httpBackend.when('POST', /login/).respond(function(method, url,data) {
      data = JSON.parse(data);
      if (data.username === 'uname' && data.password === 'hellothere') {
        return [200, {_id: 'aaa', username: data.username}];
      }
      return [422];
    });
    $httpBackend.when('POST', /logout/).respond(function() {
      return [204];
    });
    $httpBackend.when('GET', /getProfile/).respond(function(method, url, data) {
      return [200, {_id: 'aaa', username: 'uname',
      messages: [{from: 'bbb', to: 'aaa', _id:'messageid', message:'hellofriend',
                  time: Date.now()
                }]
      }];
    });
    $httpBackend.when('GET', /getUsersById/).respond(function() {
      return [200, [{_id: 'bbb', username: 'otheruser'}]];
    });
    $httpBackend.when('DELETE', /deleteMessage/).respond(function() {
      return [204];
    });
    $httpBackend.when('POST', /sendMessage/).respond(function(method, url, data) {
      data = JSON.parse(data);
      return [200, {_id: 'nicemessageid', from: 'aaa', to: 'aaa', message: data.message, time: Date.now()}];
    });
    $httpBackend.when('GET', /partials|js|css/).passThrough();
  }]);
};
