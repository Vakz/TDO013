var nconf = require('nconf')

nconf.argv().env();

nconf.defaults({
  database: {
    address: 'localhost/',
    db: 'social_website',
    collections: {
      auth: 'users'
    },
  },
  port: 8888
});

module.exports = nconf;
