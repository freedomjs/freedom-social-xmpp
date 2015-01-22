/*
 * GTalk integration tests use 2 test accounts.  Credentials for these accounts
 * are defined in gtalk_credentials.js.  To avoid flakiness, you should replace
 * the account credentials in gtalk_credentials.js with credentials from
 * accounts that only you are using.  See gtalk_credentials.js for more info.
 *
 * Possible flakiness in these tests may occur when using the default (shared)
 * accounts if:
 * - If multiple users run the tests at the same time, they may send messages
 *   to each other, rather than between the 2 social clients running in the
 *   same test
 * - If tests are run too frequently, GTalk may throttle messages sooner
 *   (return 503 "service unavailable")
 * To prevent flakiness, these tests should only be run by 1 person at a time
 * (per pair of tests accounts) with some time (rough estimate 10 minutes)
 * between each attempt.
 */


var REDIRECT_URL = 'https://www.uproxy.org/oauth-redirect-uri';
var CLIENT_ID =
    '746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com';

var OAuthView = function() {};
OAuthView.prototype.initiateOAuth = function(redirectURIs, continuation) {
  continuation({redirect: REDIRECT_URL, state: ''});
  return true;
};
OAuthView.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  if (!this.refreshToken) {
    continuation(undefined, 'No refreshToken set.');
    return;
  }
  return Helper.getAccessToken(this.refreshToken).then(function(accessToken) {
    continuation(REDIRECT_URL + '?access_token=' + accessToken);
  }).catch(function(e) {
    continuation(undefined, 'Failed to get access token');
  });
};

var Helper = {
  // Returns a Promise that fulfills with an access token.
  getAccessToken: function(refreshToken) {
    return new Promise(function(fulfill, resolve) {
      var data = 'refresh_token=' + refreshToken +
          '&client_id=' + CLIENT_ID +
          '&client_secret=h_hfPI4jvs9fgOgPweSBKnMu' +
          '&grant_type=refresh_token';
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/oauth2/v3/token', true);
      xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
      xhr.onload = function() {
        fulfill(JSON.parse(this.response).access_token);
      };
      xhr.send(data);
    });
  },
  // Returns a promise that fulfills when socialClient has been logged in
  // using the loginEmail address.  loginEmail must have an associated
  // refresh token.
  loginAs: function(socialClient, loginEmail) {
    return socialClient.login({
        agent: 'integration',
        version: '0.1',
        url: '',
        interactive: false,
        rememberLogin: false
      });
  },
  // Sets up an onClientState listener and invokes the callback function
  // anytime a new client for the given userId appears as ONLINE.
  onClientOnline: function(socialClient, userId, callback) {
    var onlineClientIds = {};
    socialClient.on('onClientState', function(clientState) {
      if (clientState.userId == userId &&
          clientState.status == 'ONLINE' &&
          !onlineClientIds[clientState.clientId]) {
        // Mark this client as online so we don't re-invoke the callback
        // extra times (e.g. when only lastUpdated has changed.)
        onlineClientIds[clientState.clientId] = true;
        callback(clientState);
      }
    });
  },
  // Calls logout on each social client in the array, then calls done
  // after all logouts have completed.
  logoutThenDone: function(socialClientsArray, done) {
    var promises = [];
    for (var i = 0; i < socialClientsArray.length; ++i) {
      promises.push(socialClientsArray[i].logout());
    }
    Promise.all(promises).then(done);
  },
  mapNameToAnonymizedId: {}
};  // end of Helper

describe('GTalk', function() {
  var aliceSocialInterface;
  var bobSocialInterface;

  // Message to be sent between peers.  If a unique message is not used,
  // messages from one persons test might interfere with another person who
  // is running the same tests at the same time.
  var uniqueMsg = Math.random().toString();

  beforeEach(function(done) {
    if (!aliceSocialInterface || !bobSocialInterface) {
      AliceOAuthView = function() {};
      AliceOAuthView.prototype = new OAuthView();
      AliceOAuthView.prototype.refreshToken = REFRESH_TOKENS[ALICE_EMAIL];
      BobOAuthView = function() {};
      BobOAuthView.prototype = new OAuthView();
      BobOAuthView.prototype.refreshToken = REFRESH_TOKENS[BOB_EMAIL];
      var alicePromise = freedom('scripts/dist/social.google.json',
          {oauth: [AliceOAuthView], debug: 'log'})
          .then(function(interface) {
        aliceSocialInterface = interface;
      }.bind(this));
      var bobPromise = freedom('scripts/dist/social.google.json',
          {oauth: [BobOAuthView], debug: 'log'})
          .then(function(interface) {
        bobSocialInterface = interface;
      }.bind(this));
      Promise.all([alicePromise, bobPromise]).then(done);
    } else {
      done();
    }
  }.bind(this));

  it('Can login and logout', function(done) {
    var socialClient = aliceSocialInterface();
    Helper.loginAs(socialClient, ALICE_EMAIL).then(function(clientInfo) {
      expect(clientInfo.userId).toEqual(ALICE_EMAIL);
      expect(clientInfo.clientId).toEqual(ALICE_EMAIL + '/integration');
      expect(clientInfo.status).toEqual('ONLINE');
      Helper.logoutThenDone([socialClient], done);
    });
  });

  // This test writes to Helper.mapNameToAnonymizedId.
  it('Peers can detect each other', function(done) {
    var aliceSawBob;
    new Promise(function(fulfill, reject) { aliceSawBob = fulfill; });
    var aliceSocialClient = aliceSocialInterface();
    aliceSocialClient.on('onUserProfile', function(userProfile) {
      if (userProfile.name == BOB_NAME) {
        Helper.mapNameToAnonymizedId[BOB_NAME] = userProfile.userId;
        aliceSawBob();
      }
    });
    Helper.loginAs(aliceSocialClient, ALICE_EMAIL);

    var bobSawAlice;
    new Promise(function(fulfill, reject) { bobSawAlice = fulfill; });
    var bobSocialClient = bobSocialInterface();
    aliceSocialClient.on('onUserProfile', function(userProfile) {
      if (userProfile.name == ALICE_NAME) {
        Helper.mapNameToAnonymizedId[ALICE_NAME] = userProfile.userId;
        bobSawAlice();
      }
    });
    Helper.loginAs(bobSocialClient, BOB_EMAIL);

    Promise.all([aliceSawBob, bobSawAlice]).then(done);
  });

  it('Can send messages', function(done) {
    var aliceSocialClient = aliceSocialInterface();

    // Setup a listener to send Bob messages when he is online
    Helper.onClientOnline(
        aliceSocialClient, Helper.mapNameToAnonymizedId[BOB_NAME],
        function(clientState) {
      aliceSocialClient.sendMessage(clientState.clientId, uniqueMsg);
    });

    // Login as Alice.
    Helper.loginAs(aliceSocialClient, ALICE_EMAIL)
        .then(function(aliceClientInfo) {
      // Next login as Bob.
      var bobSocialClient = bobSocialInterface();
      Helper.loginAs(bobSocialClient, BOB_EMAIL).then(function(bobClientInfo) {
        bobSocialClient.on('onMessage', function(messageData) {
          if (messageData.userId == Helper.mapNameToAnonymizedId[ALICE_NAME] &&
              messageData.message.substr(0, uniqueMsg.length) == uniqueMsg) {
            Helper.logoutThenDone([aliceSocialClient, bobSocialClient], done);
          }
        });  // end of bobSocialClient.on('onMessage', ...
      });  // end of Helper.loginAs(bob...)
    });  // end of Helper.loginAs(alice...)
  });

  // We should be able to send 8 messages per second from one peer to another
  // without being throttled by GTalk (i.e. we should not get 503 "service
  // unavailable" errors).
  it('Can send 8 messages per second', function(done) {
    var TOTAL_MESSAGES = 8;
    // We should wait 10ms longer than the message batching frequency (100ms)
    // to ensure that every message is sent individually.
    var MESSAGE_FREQUENCY = 110;
    var aliceSocialClient = aliceSocialInterface();

    // Setup a listener to send Bob messages when he is online
    Helper.onClientOnline(
        aliceSocialClient, Helper.mapNameToAnonymizedId[BOB_NAME],
        function(clientState) {
      var sentMessageCount = 0;
      for (var i = 1; i <= TOTAL_MESSAGES; ++i) {
        setTimeout(function() {
          aliceSocialClient.sendMessage(
              clientState.clientId, uniqueMsg + ':' + sentMessageCount);
          ++sentMessageCount;
        }, MESSAGE_FREQUENCY * i);
      }
    });

    // Login as Alice.
    Helper.loginAs(aliceSocialClient, ALICE_EMAIL)
        .then(function(aliceClientInfo) {
      // Next login as Bob and monitor for messages.
      var bobSocialClient = bobSocialInterface();
      Helper.loginAs(bobSocialClient, BOB_EMAIL).then(function(bobClientInfo) {
        var receivedMessageCount = 0;
        bobSocialClient.on('onMessage', function(messageData) {
          if (messageData.userId == Helper.mapNameToAnonymizedId[ALICE_NAME] &&
              messageData.message.substr(0, uniqueMsg.length) == uniqueMsg) {
            // Keep this trace so we know how many messages are received
            // in case of failure.
            expect(messageData.message).toEqual(
                uniqueMsg + ':' + receivedMessageCount);
            ++receivedMessageCount;
            if (receivedMessageCount == TOTAL_MESSAGES) {
              Helper.logoutThenDone([aliceSocialClient, bobSocialClient], done);
            }
          }
        });  // end of bobSocialClient.on('onMessage', ...
      });  // end of Helper.loginAs(bob...)
    });  // end of Helper.loginAs(alice...)
  });
});
