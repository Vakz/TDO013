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
    browser.addMockModule('httpBackendMock', require('./backend'));
  });

  beforeEach(function() {
    browser.get('/#/login');
    expect(element(by.id("usernamelink")).getText()).toBe('Not logged in');
  });

  it('should log in, attempt to reroute to login, then log out', function() {
    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("hellothere");
    element(by.id('submit')).click();

    browser.sleep(1000);
    // Expect to be logged in
    expect(browser.getCurrentUrl()).toMatch(/\/profile$/);
    expect(element(by.id('usernamelink')).getText()).toBe('uname');
    // Attempt to reroute to /login
    browser.setLocation('login');
    expect(browser.getCurrentUrl()).toMatch(/\/profile$/);
    // Expect to have been rerouted back to /profile
    element(by.id('optionsbutton')).click();
    expect(element(by.css('.btn-group')).getAttribute('class')).toMatch(/\sopen(\s|$)/);
    element.all(by.id('logout')).click();
    expect(browser.getCurrentUrl()).toMatch(/\login$/);
    expect(element(by.id('usernamelink')).getText()).toBe('Not logged in');
  });

  it('should reroute to login when not logged in', function() {
    browser.get("/#/profile");
    expect(browser.getCurrentUrl()).toMatch(/login$/);
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
