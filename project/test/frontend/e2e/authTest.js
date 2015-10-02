"use strict";

process.env['database:db'] = 'social_website_test';

describe('Login', function() {
  let server = new (require('../../../lib/socialServer'))();

  beforeAll(function(done) {
    server.start();
    done();
  });

  beforeEach(function() {
    browser.get('/#/login');
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

    usernameInput.sendKeys("uname");
    passwordInput.sendKeys("longer");

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
      done();
    });
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
