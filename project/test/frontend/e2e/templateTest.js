"use strict";

process.env['database:db'] = 'social_website_test';

describe('Template', function() {
  let server = new (require('../../../lib/socialServer'))();

  beforeAll(function(done) {
    server.start();
    done();
  });

  beforeEach(function() {
    browser.get('/');
  });

  it('should not show search and options-button', function()  {
    let search = element(by.id('searchform'));
    expect(search.isDisplayed()).toBe(false);
  });
});
