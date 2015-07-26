// Returns true on success, else Error
exports.save = function(db, msg) {
  if (typeof msg == "string" && msg.length > 0 && msg.length < 140)
  {
    return db.save(msg);
  }
  return new Error("Invalid message");
};

  // Returns true on success, else error
exports.flag = function(db, msgId) {
  var id = parseInt(msgId, 10);
  if (isNaN(id)) {
    return new Error("Invalid message id");
  }
  if (id === parseFloat(msgId)) {
    return new Error("Invalid message id");
  }
  return db.flag(id);
};

exports.getall = function(db) {
    return db.getall();
};
