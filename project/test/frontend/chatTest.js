"use strict";
/*
  As this test requires the use of the backend and cannot be mocked, it
  assume two users exist; user1 and user2, both with the password aaaaaa.
  The users are friends, and there are no other entries in the database.
 */

process.env['database:db'] = 'social_website_e2e_test';

describe('Login', function() {
  let firstUser = null;
  let secondUser = null;

  var login = function(b, user) {
    b.get('/#/login');
    b.element(by.name('username')).sendKeys(user.username);
    b.element(by.name('password')).sendKeys(user.password);
    b.element(by.id('submit')).click();
  };

  var clearStorage = function(b) {
    b.executeScript('window.localStorage.clear();');
    b.manage().deleteAllCookies();
  };

  let server = new (require('../../lib/socialServer'))();
  beforeAll(function() {
    server.start();
    // Other tests uses a mocked backend, which this test does not. Thus we need a
    // forked driver without mocks loaded.
    firstUser = browser.forkNewDriverInstance();
    firstUser.get('/#/login');

    login(firstUser, {username: 'user1', password: 'asdasd'});
    firstUser.element(by.id('searchinput')).sendKeys('user2');
    firstUser.sleep(300); // Search has a delay
    firstUser.element(by.repeater('match in matches track by $index').row(0)).click();
  });

  it('should attempt to send to offline user and get error from System', function() {
    firstUser.element(by.buttonText('Send message')).click();
    expect(firstUser.element(by.buttonText('user2')).isPresent()).toBe(true);
    firstUser.element(by.id('chatinput')).sendKeys('hello').sendKeys(protractor.Key.ENTER);

    expect(firstUser.element(by.buttonText('System')).isPresent()).toBe(true);
  });

  it('should send message from user1 to user2', function() {
    // Load up second browser
    secondUser = browser.forkNewDriverInstance();
    secondUser.get('/#/login');
    login(secondUser, {username: 'user2', password: 'asdasd'});

    firstUser.element(by.buttonText('Send message')).click();
    expect(firstUser.element(by.buttonText('user2')).isPresent()).toBe(true);
    firstUser.element(by.id('chatinput')).sendKeys('hello').sendKeys(protractor.Key.ENTER);

    expect(secondUser.element(by.css('#chatcontent h4')).getText()).toBe('user1: hello');

    clearStorage(secondUser);
    secondUser.quit();
  });

  afterAll(function() {
    clearStorage(firstUser);
    firstUser.quit();
    server.stop();
  });
});
