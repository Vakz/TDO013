var ArgumentError = require('./errors.js').ArgumentError;
var DatabaseError = require('./errors.js').DatabaseError;
var ObjectID = require('mongodb').ObjectID;
// db should be a url to a mongodb
var DatabaseHandler = function(collection){
  var collection = collection;

  this.save = function(msg, callback) {
    msg = msg.trim();
    if (typeof msg !== "string" || msg.length == 0 || msg.length > 140)
    {
      callback && callback(new ArgumentError("Invalid message"), false);
      return;
    }
    collection.insertOne({'message': msg, 'flag': false}, function(err, r) {
      if (callback) {
        if (err) callback(new DatabaseError(err), false);
        else callback(null, r.ops[0]);
      }
    });
  };

  this.flag = function(msgId, callback) {
    if (!ObjectID.isValid(msgId)) {
      callback(new ArgumentError("Invalid id"), false);
      return;
    }
    collection.updateOne({_id: new ObjectID(msgId)}, {$set: {'flag': true}}
      , function(err, r) {
        //console.log(r.result)
        if (callback) {
          if (err) {
            callback(new DatabaseError(err), false);
          }
          else if (r.result['n'] == 0) {
             callback(new ArgumentError("No message with id " + msgId), false);
          }
          else {
            callback(null, true);
          }
        }
    });
  };

  this.getall = function(callback) {

    collection.find().toArray(function(err, result) {
      result.map(function(doc) {
        doc['id'] = doc['_id'].toString();
        delete doc._id;
      });
      if (callback) {
        if(err) callback(new DatabaseError(err), null)
        else callback(null, result);
      }
    });
  };
};

module.exports = DatabaseHandler;
