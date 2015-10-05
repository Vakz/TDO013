"use strict";

// Doing this on a separate db as it will require cleaning between tests
process.env['database:db'] = 'social_website_e2e_test';

describe('Profile', function() {
  let server = new (require('../../../lib/socialServer'))();
  let EC = protractor.ExpectedConditions;

  beforeAll(function() {
    server.start();
    browser.addMockModule('httpBackendMock', require('./backend'));
  });

  afterEach(function() {
    browser.executeScript('window.localStorage.clear();');
    browser.manage().deleteAllCookies();
  });

  beforeEach(function() {
    browser.get('/#/login');
    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("hellothere");
    element(by.id('submit')).click();
    browser.sleep(1000);
    expect(element(by.id('usernamelink')).getText()).toBe('uname');
  });

  it('should get valid profile', function() {
    browser.get('/#/profile/aaa');
    expect(element(by.css('h1')).getText()).toBe('uname');
    expect(element.all(by.css('.messagetext')).last().getText()).toBe('hellofriend');
  });

  it('should delete message', function() {
    browser.get('/#/profile/aaa');
    expect(element.all(by.css('.messagetext')).count()).toBe(2);
    element.all(by.buttonText('Delete')).last().click();
    expect(element.all(by.css('.messagetext')).count()).toBe(1);
  });

  it('should make a new message', function() {
    browser.get('/#/profile/aaa');
    element(by.name('messagebox')).sendKeys('newmessage');
    element(by.id('submit')).click();
    expect(element.all(by.css('.messagetext')).get(1).getText(2)).toBe('newmessage');
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
