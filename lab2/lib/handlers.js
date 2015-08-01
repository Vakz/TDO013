// Returns true on success, else Error

var ArgumentError = require('./errors.js').ArgumentError;
var DatabaseError = require('./errors.js').DatabaseError;
var ObjectId = require('mongodb').ObjectId;
// db should be a url to a mongodb
var Handler = function(collection){
  var collection = collection;

  this.save = function(msg, done) {
    msg = msg.trim();
    if (typeof msg !== "string" || msg.length == 0 || msg.length > 140)
    {
      done(new ArgumentError("Invalid message"), false)
    }
    collection.insertOne({'message': msg, 'flag': false}, function(err, r) {
      if (err) done(new DatabaseError(err), false);
      else done(null, true)
    });

  };

  this.flag = function(msgId, done) {
    // IDs are not numeric?
    /*
    if (isNaN(msgId)) {
      return new ArgumentError("Non-numeric id");
    }
    if (id === parseFloat(msgId)) {
      return new ArgumentError("Non-integer id");
    }*/
    return collection.updateOne({_id: new MongoClient.ObjectId(msgId)},
      {'flag': true}, function(err, r) {
        if (err) done(new DatabaseError(err), false);
        else done(null, true);
      });
  };

  this.getall = function(done) {
      collection.find().toArray(function(err, result) {
        result.map(function(doc) {
          return doc['_id'] = doc['_id'].toString();
        });
        if(err) done(new DatabaseError(err), null)
        else done(null, result);
      });
  };
};

module.exports = Handler;
