var nconf = require('nconf');

nconf.argv().env();

nconf.defaults({
  database: {
    address: 'localhost/',
    db: 'social_website',
    collections: {
      auth: 'users'
    },
  },
  security:{
    sessions:{
      key: "vC1ux6jiN7bjZ2M26EXF8eXEjH7neI",
      tokenLength: 30,
      sessionDuration: 1000 * 60 * 60 * 24,
      activeDuration: 1000 * 60 * 60 * 24
    },
  },
  port: 8888
});

module.exports = nconf;
