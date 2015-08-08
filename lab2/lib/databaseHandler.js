var ArgumentError = require('./errors.js').ArgumentError;
var DatabaseError = require('./errors.js').DatabaseError;
var ObjectID = require('mongodb').ObjectID;
// db should be a url to a mongodb
var DatabaseHandler = function(collection){
  var collection = collection;

  this.save = function(msg, done) {
    done = done || function() {};
    msg = msg.trim();
    if (typeof msg !== "string" || msg.length == 0 || msg.length > 140)
    {
      done(new ArgumentError("Invalid message"), false);
      return;
    }
    collection.insertOne({'message': msg, 'flag': false}, function(err, r) {
      if (err) done && done(new DatabaseError(err), false);
      else done(null, r.ops[0]);
    });
  };

  this.flag = function(msgId, done) {
    done = done || function() {};
    if (!ObjectID.isValid(msgId)) {
      done(new ArgumentError("Invalid id"), false);
      return;
    }
    collection.updateOne({_id: new ObjectID(msgId)}, {'flag': true}
      , function(err, r) {
        if (err) {
          done(new DatabaseError(err), false);
        }
        else if (r.result['nModified'] == 0) {
           done(new ArgumentError("No message with id" + msgId), false);
        }
        else {
          done(null, true);
        }
    });
  };

  this.getall = function(done) {
    done = done || function() {};

    collection.find().toArray(function(err, result) {
      result.map(function(doc) {
        doc['_id'] = doc['_id'].toString();
      });
      if(err) done(new DatabaseError(err), null)
      else done(null, result);
    });
  };
};

module.exports = DatabaseHandler;
