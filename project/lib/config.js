var nconf = require('nconf')

nconf.argv().env();

nconf.defaults({
  'database': {
    'address': 'mongodb://127.0.0.1:27017/',
    'db': 'social_website',
    'authCollection': 'users',
  },
  'port': 8888
});

module.exports = nconf;
