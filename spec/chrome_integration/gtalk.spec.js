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
  }
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

  it('Can send messages', function(done) {
    // 1st login as Alice.
    var aliceSocialClient = aliceSocialInterface();
    Helper.loginAs(aliceSocialClient, ALICE_EMAIL)
        .then(function(aliceClientInfo) {
      // Next setup a listener to send Bob messages when he is online
      Helper.onClientOnline(
          aliceSocialClient, BOB_ANONYMIZED_ID, function(clientState) {
        aliceSocialClient.sendMessage(clientState.clientId, uniqueMsg);
      });

      // Next login as Bob and monitor for messages.
      var bobSocialClient = bobSocialInterface();
      Helper.loginAs(bobSocialClient, BOB_EMAIL).then(function(bobClientInfo) {
        bobSocialClient.on('onMessage', function(messageData) {
          if (messageData.from.userId == ALICE_ANONYMIZED_ID &&
              messageData.message == uniqueMsg) {
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

    // 1st login as Alice.
    var aliceSocialClient = aliceSocialInterface();
    Helper.loginAs(aliceSocialClient, ALICE_EMAIL)
        .then(function(aliceClientInfo) {
      // Next setup a listener to send Bob messages when he is online
      Helper.onClientOnline(
          aliceSocialClient, BOB_ANONYMIZED_ID, function(clientState) {
        var sentMessageCount = 0;
        for (var i = 1; i <= TOTAL_MESSAGES; ++i) {
          setTimeout(function() {
            aliceSocialClient.sendMessage(
                clientState.clientId, uniqueMsg + ':' + sentMessageCount);
            ++sentMessageCount;
          }, MESSAGE_FREQUENCY * i);
        }
      });

      // Next login as Bob and monitor for messages.
      var bobSocialClient = bobSocialInterface();
      Helper.loginAs(bobSocialClient, BOB_EMAIL).then(function(bobClientInfo) {
        var receivedMessageCount = 0;
        bobSocialClient.on('onMessage', function(messageData) {
          if (messageData.from.userId == ALICE_ANONYMIZED_ID &&
              messageData.message.substr(0, uniqueMsg.length) == uniqueMsg) {
            // Keep this trace so we know how many messages are received
            // in case of failure.
            console.log('received message: ' + messageData.message);
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
