"use strict";

/*
 As register and login are built on the same template and controller,
 it actually has almost identical tests as well.
*/

// Doing this on a separate db as it will require cleaning between tests
process.env['database:db'] = 'social_website_e2e_test';

describe('Route', function() {
  let server = new (require('../../../lib/socialServer'))();
  let EC = protractor.ExpectedConditions;

  browser.addMockModule('httpBackendMock', require('./backend'));

  afterEach(function() {
    browser.executeScript('window.localStorage.clear();');
    browser.manage().deleteAllCookies();
  });

  beforeEach(function() {
    browser.get('/#/register');
    expect(element(by.id("usernamelink")).getText()).toBe('Not logged in');
  });

  it('form should not be valid', function() {
    expect(element(by.name('username')).getAttribute('class')).toMatch(/\sng-invalid\s/);
    element(by.id("submit")).click();
    expect(element(by.name('loginform')).getAttribute('class')).toMatch(/\sng-invalid\s/);
  });

  it('form should not be valid', function() {
    element(by.name('password')).sendKeys("short");
    expect(element(by.name('password')).getAttribute('class')).toMatch(/\sng-invalid\s/);
    expect(element(by.id("submit")).isEnabled()).toBe(false);
  });

  it('registration should be valid', function() {
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
    browser.wait(complete, 100);
    expect(element(by.id('usernamelink')).getText()).toBe('uname');
  });

  it('registration should fail', function() {
    let passwordInput = element(by.name('password'));
    let usernameInput = element(by.name('username'));

    usernameInput.sendKeys("uname");
    passwordInput.sendKeys("wrongpassword");

    element(by.id('submit')).click();
    // Give server one second to respond
    browser.sleep(100);
    expect(element(by.css('.bg-danger')).isPresent()).toBe(true);
  });

  beforeAll(function() {
    server.start();
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
