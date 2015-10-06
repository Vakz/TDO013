"use strict";

var strings = {
  noParamId: "No parameter 'ids'",
  noParamPassword: "Missing parameter 'password'",
  noParamReceiver: "Missing parameter 'receiver'",
  noParamMessage: "Missing parameter 'message'",
  noParamMessageId: "Missing parameter 'messageId'",
  noParamFriendId: "Missing parameter 'friendId'",
  messageTooLong: "Message is too long",
  invalidIds: "Invalid ids",
  missingParams: "Missing parameters",
  alreadyLoggedIn: "User already logged in",
  notLoggedIn: "User not logged in",
  passwordTooShort: "Password too short",
  noUser: "User does not exist",
  noMessage: "Message does not exist",
  passwordIncorrect: "Incorrect password",
  noAccess: "User does not have access to target user",
  dbNotConnected: "Not connected to database",
  invalidId: "id is invalid",
  noUpdated: "No user updated",
  idArrayInvalid: "ids should be an array of valid IDs",
  registerInvalidParams: "Only username and password should be specified",
  registerMissingParams: "Username and hash must be specified",
  usernameTaken: "Username already taken",
  noParams: "Must specify at least one parameter",
  emptySearchword: "Searchword cannot be empty",
  emptyMessage: "Message cannot be empty",
  alreadyFriends: "Users are already friends",
  notOwnedMessage: "Cannot delete message owned by another user",
  duplicateIds: "Both ids cannot be the same",
  notFriends: "Not friends with target user",
  notOnline: "User is not online",
  sendSelf: "Don't send messages to yourself",
  invalidMessage: 'Message object is invalid'
};

Object.freeze(strings);
module.exports = strings;
