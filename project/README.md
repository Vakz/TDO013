# Frontend

### General design principle
- ✓ For template, show search bar in top right
- ✓ In top left, either show username (link to profile)
- ✓ When logged in, save id, username and simple "logged in"-variable in local storage
- ✗ Redirect to login if not logged in
- ✗ Default to own profile after logging in, or entering /profile without id
- ✗ When searching, get suggestions in a dropdown list (use debounce)
- ✓ Button to options

- ✗ For main content, use a white box, possible with gradient (black-white-black) with shadow for weight

#### Options
- ✗ Change password
- ✗ Log out everywhere (reset token)

#### Profiles
- ✗ Tabs for showing messages or showing friends (eventually add showing images)
- ✗ Show input at the top for writing a new message. Show preview. (only on message tab)
- ✗ At the top of content box, show username. Next to username, show "Add to friends" or "You are friends" if not self.

#### Search
- ✗ Repurpose friendslist (write directive?)

#### Registration
- ✗ Check with backend if username is available


# Backend
### mongodb
IDs are generated using ObjectID, but are stored as strings, simply because it's easier than keeping track and making sure to cast it back and forth. I feel that it's worth the tradeoff of 12 extra bytes to store.

#### Bugs
When installing, libkrb5-dev is required

### Sessions
Sessions are built using client-sessions. In order to revoke all sessions from server side, a token is used in accordance to this blog post:

https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3

### Required database functionality:
- ✓ Register new user
- ✓ Get user info (simply fetch all direct info, relevant or not). Filter what is relevant outside database handler.
- ✓ Update user token
- ✓ Update user password
- ✓ Find users based on partial username
- ✓ Submit new message on friend page. Requires sender id, reciever id, message text and date
- ✓ Get all messages related to a userId
- ✓ Get all friends related to a userId
- ✓ Unfriend
- ✓ Delete message

### Requried requesthandler functionality:
- ✓ Register new user
- ✓ Get a user
- ✓ Get usernames of several users by id
- ✓ Update passwords
- ✓ Reset all sessions
- ✓ Search for users based on partial username
- ✓ Get profile with id, username and messages (profile "frontpage")
- ✓ Login
- ✓ Logout
- ✓ Send new message
- ✓ Delete own messages
- ✓ Friend another user
- ✓ Unfriend another user
- ✓ Check if two users are friends
- ✓ Get a list of all friends
