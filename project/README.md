# Social Website
Site uses NodeJS and MongoDB as backend. On the frontend AngularJS is used, as well as the CSS from Bootstrap. Bower is used for frontend dependencies, and can be install either by running *bower install* or simply by running *npm install*, which will install all backend dependencies, and then install frontend dependencies as a postinstall script.

### Sessions
Sessions are built using client-sessions. In order to revoke all sessions from server side, a token is used in accordance to this blog post:

https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3

### Configuration
System config uses [nconf](https://www.npmjs.com/package/nconf). All settings are placed in lib/config.js.

## Tests
### Backend
Backend tests should be testing everything that was considered test-able. Some, which were very repetative, such as checking whether the user is logged in, is only tested in some cases, as the code is exactly the same and the tests would have been the same, and thus somewhat of a waste of time to write.

Request-tests are done using node-mocks-http and calls directly on RequestHandler, rather than using superagent to call the server, simply because I felt this was a more low-level way of doing it, as the server routes directly call on RequestHandler functions anyway.

##### Notes
A RequestHandler test, which tests getMessages functionality to get a message after a certain time, will occassionally fail if both messages are inserted at the same millisecond (and thus have the exact same timestamp).

### Frontend
Frontend tests are mostly done with Protractor. Running *npm run preprotractor* will set up the webdriver, and *npm run protractor* will run the actual tests with the correct configuration file. With the exception of the ChatTest, all frontend tests uses a mocked backend. Due to the complexity of the chat backend, it cannot be mocked, and thus requires the actual backend. More info on the requirements of the test (and data in the database) can be found in the test file, tests/frontend/e2e/chatTest.js.

I considered writing unit tests for the frontend using Karma, but eventually found them somewhat redundant and while they did have some use, they simply weren't worth the time it took to write them, as any bugs found through the unit tests would also have been caught by the E2E tests. Image uploads are minimal, due to the difficulty of actually uploading an image. Thus image handling tests are only done on the backend.

## Functional design
#### General design principle
- ✓ For template, show search bar in top right
- ✓ In top left, either show username (link to profile)
- ✓ When logged in, save id, username and simple "logged in"-variable in local storage
- ✓ Redirect to login if not logged in
- ✓ Default to own profile after logging in, or entering /profile without id
- ✓ When searching, get suggestions in a dropdown list (use debounce)
- ✓ Button to options

#### Options
- ✓ Change password
- ✓ Log out everywhere (reset token)

#### Profiles
- ✓ Show error and "add friend"-button when looking at profile of non-friend
- ✓ Hide tabs when not on "friendly" page
- ✓ Tabs for showing messages or showing friends (eventually add showing images)
- ✓ Show input at the top for writing a new message. Show preview. (only on message tab)

### Backend
#### mongodb
IDs are generated using ObjectID, but are stored as strings, simply because it's easier than keeping track and making sure to cast it back and forth. I feel that it's worth the tradeoff of 12 extra bytes to store.

###### Bugs
When installing, libkrb5-dev may be required as a separate install

#### Required database functionality:
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

#### Requried requesthandler functionality:
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
