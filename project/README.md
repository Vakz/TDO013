mongodb
-------
IDs are generated using ObjectID, but are stored as strings, simply because it's easier than keeping track and making sure to cast it back and forth. I feel that it's worth the tradeoff of 12 extra bytes to store.

Sessions
---------
Sessions are built using client-sessions. In order to revoke all sessions from server side, a token is used in accordance to this blog post:

https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/

Bugs
----
When installing Mongodb, libkrb5-dev is required

Required database functionality:
--------------------------------
DONE
- Register new user
- Get user info (simply fetch all direct info, relevant or not). Filter what is relevant outside database handler.
- Update user token
- Update user password
- Find users based on partial username
- Submit new message on friend page. Requires sender id, reciever id, message text and date
- Get all messages related to a userId
- Get all friends related to a userId
- Unfriend
- Delete message

Requried requesthandler functionality:
--------------------------------------
DONE:
- Register new user
- Get a user
- Get usernames of several users by id
- Update passwords
- Reset all sessions
- Search for users based on partial username
- Get profile with id, username and messages (profile "frontpage")
- Login
- Logout
- Send new message
- Delete own messages
- Friend another user
- Unfriend another user
- Check if two users are friends

TODO:

- Get a list of all friends
