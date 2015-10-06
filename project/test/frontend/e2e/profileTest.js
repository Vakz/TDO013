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
    expect(element.all(by.css('h3')).get(1).getText()).toMatch(/^uname\s/);
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
    expect(element(by.name('messagebox')).getText()).toBe('');
    expect(element.all(by.css('.messagetext')).get(1).getText()).toBe('newmessage');
  });

  it('should be denied access', function() {
    browser.get('/#/profile/nonfriend');
    browser.sleep(150);
    expect(element.all(by.css('h3')).get(1).getText()).toMatch(/^notyourfriend\s/);
  });

  it('should not show friendstab on non-owned profile', function() {
    browser.get('/#/profile/bbb');
    // Ensure user is a friend
    expect(element(by.linkText('Messages')).isPresent()).toBe(true);
    expect(element(by.linkText('Friends')).isPresent()).toBe(false);
  });

  it('should list friends', function() {
    browser.get('/#/profile/aaa');
    var friendstab = element(by.linkText('Friends'));
    expect(friendstab.isPresent()).toBe(true);
    friendstab.click();
    expect(element.all(by.css('.tab-pane h4')).count()).toBe(2);
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
