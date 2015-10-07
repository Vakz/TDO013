"use strict";

process.env['database:db'] = 'social_website_e2e_test';

describe('Template', function() {
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
    browser.get('/');
  });

  it('should not show search and options-button', function()  {
    let search = element(by.id('searchform'));
    expect(search.isDisplayed()).toBe(false);
  });

  it('should open options modal', function() {
    browser.get('/#/login');
    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("hellothere");
    element(by.id('submit')).click();
    browser.sleep(100);

    let optionsButton = element(by.id('optionsbutton'));
    optionsButton.click();
    expect(optionsButton.element(by.xpath('..')).getAttribute('class')).toMatch(/\sopen(\s|$)/);
    element(by.id('options')).click();
    expect(element(by.css('.modal-content')).isPresent()).toBe(true);
  });

  it('should change password and stay logged in', function() {
    // Log in
    browser.get('/#/login');
    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("hellothere");
    element(by.id('submit')).click();
    browser.sleep(100);

    element(by.id('optionsbutton')).click();
    element.all(by.id('options')).click();

    element(by.name('password')).sendKeys('newpassword');
    element(by.name('verifyPassword')).sendKeys('newpassword');
    element(by.buttonText('Set password')).click();
    browser.sleep(100);
    expect(element(by.exactBinding('message')).getText()).toBe('Password changed!');
    expect(browser.getCurrentUrl()).toMatch(/profile/);
  });

  it('should change password and get logged out', function() {
    // Log in
    browser.get('/#/login');
    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("hellothere");
    element(by.id('submit')).click();
    browser.sleep(100);

    element(by.id('optionsbutton')).click();
    element.all(by.id('options')).click();

    element(by.name('password')).sendKeys('newpassword');
    element(by.name('verifyPassword')).sendKeys('newpassword');
    element(by.model('reset')).click();
    element(by.buttonText('Set password')).click();
    browser.sleep(100);
    expect(browser.getCurrentUrl()).toMatch(/login/);
  });


  it('reset sessions and get logged out', function() {
    browser.get('/#/login');
    element(by.name('username')).sendKeys("uname");
    element(by.name('password')).sendKeys("hellothere");
    element(by.id('submit')).click();
    browser.sleep(100);

    element(by.id('optionsbutton')).click();
    element.all(by.id('options')).click();

    element(by.id('resetButton')).click();
    browser.sleep(100);
    expect(browser.getCurrentUrl()).toMatch(/login/);
  });

  afterAll(function(done) {
    server.stop();
    done();
  });
});
