"use strict";

process.env['database:db'] = 'social_website_e2e_test';

describe('Route', function() {
  let server = new (require('../../../lib/socialServer'))();

  afterEach(function() {
    browser.executeScript('window.localStorage.clear();');
    browser.manage().deleteAllCookies();
  });

  beforeAll(function() {
    server.start();
  });

  beforeEach(function(done) {
    browser.get('/#/login');
    element(by.id("usernamelink")).getText()
    .then(function(text) {
      expect(text).toBe('Not logged in');
      done();
    });
  });

  it('should log in, attempt to reroute to login, then log out', function(done) {
    let passwordInput = element(by.name('password'));
    let usernameInput = element(by.name('username'));

    usernameInput.sendKeys("uname");
    passwordInput.sendKeys("hellothere");

    element(by.id('submit')).click();

    browser.sleep(1000);

    browser.getCurrentUrl()
    .then(function(url) {
      expect(/\/profile$/.test(url)).toBe(true);
      return element(by.id('usernamelink')).getText();
    })
    .then(function(text) {
      expect(text).toBe('uname');
      browser.setLocation('login');
      return browser.getCurrentUrl();
    })
    .then(function(url) {
      expect(/\/profile$/.test(url)).toBe(true);
      element(by.id('optionsbutton')).click();
      return element(by.css('.btn-group')).getAttribute('class');
    })
    .then(function(classes) {
      expect(classes).toMatch(/\sopen(\s|$)/);
    })
    .then(function() {
      element.all(by.id('logout')).click();
      return browser.getCurrentUrl();
    })
    .then(function(url) {
      expect(/\login$/.test(url)).toBe(true);
      return element(by.id('usernamelink')).getText();
    })
    .then(function(text) {
      expect(text).toBe('Not logged in');
      done();
    });
  });

  it('should reroute to login when not logged in', function(done) {
    browser.get("/#/profile");
    browser.getCurrentUrl()
    .then(function(url) {
      expect(/login$/.test(url)).toBe(true);
      done();
    });
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
