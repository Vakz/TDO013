"use strict";

process.env['database:db'] = 'social_website_e2e_test';

describe('Login', function() {
  let server = new (require('../../../lib/socialServer'))();
  let EC = protractor.ExpectedConditions;

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

  it('should be valid', function(done) {
    let passwordInput = element(by.name('password'));
    let usernameInput = element(by.name('username'));

    let complete = EC.and(function() {
      return browser.getCurrentUrl().then((url) => /\/profile$/.test(url));
    });

    usernameInput.sendKeys("uname");
    passwordInput.sendKeys("hellothere");

    usernameInput.getAttribute('class')
    .then(function(classes) {
      expect(classes).toMatch(/\sng-valid\s/);
      return passwordInput.getAttribute('class');
    })
    .then(function(classes) {
      expect(classes).toMatch(/\sng-valid\s/);
      return element(by.name('loginform')).getAttribute('class');
    })
    .then(function(classes) {
      expect(classes).toMatch(/\sng-valid\s/);
    })
    .then(function() {
      element(by.id('submit')).click();
      // Wait 2 seconds for server to respond
      browser.wait(complete, 2000);
      done();
    });
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
