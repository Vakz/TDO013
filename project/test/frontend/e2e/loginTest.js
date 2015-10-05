"use strict";

process.env['database:db'] = 'social_website_e2e_test';

describe('Login', function() {
  let server = new (require('../../../lib/socialServer'))();
  let EC = protractor.ExpectedConditions;

  beforeAll(function() {
    server.start();
    browser.addMockModule('httpBackendMock', require('./backend'));

  });

  beforeEach(function() {
    browser.get('/#/login');
  });

  afterEach(function() {
    browser.executeScript('window.localStorage.clear();');
    browser.manage().deleteAllCookies();
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

  it('login should be valid', function() {
    let complete = EC.and(function() {
      return browser.getCurrentUrl().then((url) => /\/profile$/.test(url));
    });

    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("hellothere");
    let submitButton = element(by.id('submit'));

    expect(submitButton.isEnabled()).toBe(true);
    submitButton.click();
    // Wait 1 seconds for server to respond
    browser.wait(complete, 1000);
    expect(element(by.id('usernamelink')).getText()).toBe('uname');
  });

  it('login should fail', function(done) {

    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("wrongpassword");
    element(by.id('submit')).click();
    browser.sleep(1000);

    // Assert error message is shown
    expect(element(by.css('.bg-danger')).isPresent()).toBe(true);
    done();
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
