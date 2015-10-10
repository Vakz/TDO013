"use strict";

let nconf = require('nconf');

nconf.argv().env();

nconf.defaults({
  database: {
    address: 'mongodb://localhost/',
    db: 'social_website',
    collections: {
      auth: 'users',
      messages: 'messages',
      friendships: 'friendships',
      images: 'images'
    },
  },
  security:{
    sessions:{
      key: "vC1ux6jiN7bjZ2M26EXF8eXEjH7neI",
      tokenLength: 20,
      tokenChars: "\\x20-\\x7F", // Any printable ASCII
      sessionDuration: 1000 * 60 * 60 * 24,
      activeDuration: 1000 * 60 * 60 * 24
    },
    passwords:{
      minLength: 6,
      saltRounds: 4
    }
  },
  server: {
    port: 45555,
    profileWatchPort: 45557
  },
  users: {
    acceptableCharacters: "\\w\\d._",
    usernameMaxLength: 10
  },
  messages: {
    maxLength: 200
  },
  chat: {
    port: 45556,
    maxLength: 100
  }
});

module.exports = nconf;
