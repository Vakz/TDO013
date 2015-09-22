var Q = require('q');
var mongodb = require('mongodb');
var config = require('../lib/config')
var db = null;
var collections = [];
exports.start = function() {
  return Q.Promise(function(resolve, reject) {
    var c = config.get('database:collections');
    Object.keys(c).forEach(function(key) {
      collections[collections.length] = c[key];
    })

    mongodb.MongoClient.connect(
      config.get('database:address') + config.get('database:db'),
      function(err, _db) {
        db = _db;
        resolve();
    });
  })
};

exports.cleanDb = function() {

  return Q.Promise(function(resolve, reject)
  {
    collections.forEach(function(collection) {
      db.collection(collection).removeMany();
    });
    resolve();
  });

}

exports.close = function() {
  db.close();
}
