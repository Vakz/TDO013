exports.save = function(msg)
{
  if (typeof msg != 'string') throw new Error("Non-string argument was passed");
  if (msg.length < 0) throw new Error("Message with zero length was passed");
  if (msg.length > 140) throw new Error("Message with too many characters passed");

  return true;
};

exports.flag = function(msgId) {
  if (typeof msgId !== 'number') throw new Error("Non-numerical id passed");
  if (Math.floor(msgId) !== msgId) throw new Error("Non-integer id passed");
  if (msgId < 0) throw new Error("Negative id passed");

  return true;
};

exports.getall = function() {
  return [{id: '47cc67093475061e3d95369d', message: 'meddelande', flag: false},
         {'id': '875a47093475061e3d95369d', message: 'message', flag: true}]
};
