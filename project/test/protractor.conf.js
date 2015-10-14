exports.config = {
  specs: [
    'frontend/e2e/chatTest.js'
  ],

  capabilites: {
    browserName: 'chrome'
  },

  baseUrl: 'http://localhost:45555',

  framework: 'jasmine2',

  jasmineNodeOpts: {
    showColors: true
  }
};
