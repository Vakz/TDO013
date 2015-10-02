module.exports = function(config){
  config.set({
    basePath: '../',

    files: [
      'static/bower_components/angular/angular.js',
      'static/bower_components/angular-animate/angular-animate.js',
      'static/bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'static/bower_components/angular-route/angular-route.js',
      'static/bower_components/angular-mocks/angular-mocks.js',
      'static/bower_components/ngstorage/ngStorage.js',
      'static/bower_components/angular-messages/angular-messages.js',
      'static/js/socialApplication.js',
      'static/js/services.js',
      'static/js/controllers.js',
      'test/frontend/unit/*Test.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['Chrome', 'Firefox'],

    plugins : [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-jasmine'
            ]

  });
};
