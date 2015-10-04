"use strict";

process.env['database:db'] = 'social_website_e2e_test';

describe('Login', function() {
  let server = new (require('../../../lib/socialServer'))();
  let EC = protractor.ExpectedConditions;

  browser.addMockModule('httpBackendMock', function() {
    angular.module('httpBackendMock', ['socialApplication', 'ngMockE2E'])
    .run(['$httpBackend', function($httpBackend) {
      $httpBackend.whenPOST(/login/).respond(function(method, url, data) {
        data = JSON.parse(data);
        if (data.password === 'hellothere') {
          return [200, {_id: 'a', username: data.username}];
        }
        return [422];
      });
      $httpBackend.whenPOST(/logout/).respond(function() {
        return [204];
      });
      $httpBackend.whenPOST(/.*/).passThrough();
      $httpBackend.whenGET(/.*/).passThrough();
    }]);
  });

  beforeAll(function(done) {
    server.start();
    done();
  });

  beforeEach(function() {
    browser.get('/#/login');
  });

  afterEach(function() {
    browser.executeScript('window.localStorage.clear();');
    browser.manage().deleteAllCookies();
  });

  it('form should not be valid', function(done) {
    element(by.name('username')).getAttribute('class')
    .then(function(classes) {
      expect(classes).toMatch(/\sng-invalid\s/);
    })
    .then(function() {
      element(by.id("submit")).click();
      return element(by.name('loginform')).getAttribute('class');
    })
    .then(function(classes) {
      expect(classes).toMatch(/\sng-invalid\s/);
      done();
    });
  });

  it('form should not be valid', function(done) {
    element(by.name('password')).sendKeys("short");
    element(by.name('password')).getAttribute('class')
    .then(function(classes) {
      // Make sure password is correctly pointing out it is invalid
      expect(classes).toMatch(/\sng-invalid\s/);
    })
    .then(function() {
      expect(element(by.id("submit")).isEnabled()).toBe(false);
      done();
    });
  });

  it('login should be valid', function() {
    let passwordInput = element(by.name('password'));
    let usernameInput = element(by.name('username'));
    let submitButton = element(by.id('submit'));

    let complete = EC.and(function() {
      return browser.getCurrentUrl().then((url) => /\/profile$/.test(url));
    });

    usernameInput.sendKeys("uname");
    passwordInput.sendKeys("hellothere");

    expect(submitButton.isEnabled()).toBe(true);
    submitButton.click();
    // Wait 1 seconds for server to respond
    browser.wait(complete, 1000);
  });

  it('login should fail', function(done) {
    let passwordInput = element(by.name('password'));
    let usernameInput = element(by.name('username'));

    usernameInput.sendKeys("uname");
    passwordInput.sendKeys("wrongpassword");

    element(by.id('submit')).click();
    // Give server one second to respond
    browser.sleep(1000);
    expect(element(by.css('.bg-danger')).isPresent()).toBe(true);
    done();
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
