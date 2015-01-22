/*
* GTalk integration tests use 2 test accounts, which should only be used in
* these tests.  Possible flakiness in these tests may occur:
* - If multiple users run the tests at the same time, they may send messages
*   to each other, rather than between the 2 social clients running in the
*   same test
* - If tests are run too frequently, GTalk may throttle messages sooner
*   (return 503 "service unavailable")
* To prevent flakiness, these tests should only be run by 1 person at a time,
* with some time (rough estimate 10 minutes) between each attempt.
 */

var ALICE_EMAIL = 'alicefreedomxmpp@gmail.com';
var BOB_EMAIL = 'bobfreedomxmpp@gmail.com';

// GTalk gives alicefreedomxpp an anoymized id for bobfreedomxmpp
// and vice-versa.
var ALICE_ANONYMIZED_ID = '3bbk93gplwqcn3abf19ivuh6s5@public.talk.google.com';
var BOB_ANONYMIZED_ID = '2s1np2b5ca5gg3tnbwbto4vscs@public.talk.google.com';

/*
 * GTalk integration tests skip the interactive Google login step and instead
 * supply an access_token that we generate using a refresh_token.
 * To get a refresh_token permissioned for the uProxy app:
 * 1. Go to this URL in your browser:
 * https://accounts.google.com/AccountChooser?service=lso&continue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fauth%3F%26response_type%3Dcode%26scope%3Demail%2Bprofile%2Bhttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgoogletalk%26access_type%3Doffline%26redirect_uri%3Dhttps%3A%2F%2Ffmdppkkepalnkeommjadgbhiohihdhii.chromiumapp.org%2F%26approval_prompt%3Dforce%26state%3Dfreedom.oauth.redirect.handler0.10543708852492273%26client_id%3D746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com%26hl%3Den%26from_login%3D1%26as%3D-589267e1881eb949&btmpl=authsub&hl=en
 * 2. After logging in and granting permission, you will be redirected to a
 * URL containing a code parameter at the end (you will see a webpage not
 * available error, but can still get the code from the URL).
 * 3. Use this code to make a POST request in curl:
 * CODE=<your_code>
 * curl --data "code=$CODE&client_id=746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com&client_secret=h_hfPI4jvs9fgOgPweSBKnMu&redirect_uri=https%3A%2F%2Ffmdppkkepalnkeommjadgbhiohihdhii.chromiumapp.org%2F&grant_type=authorization_code" https://www.googleapis.com/oauth2/v3/token
 * 4. The refresh_token return from that POST request can be used to get new
 * freeaccess_tokens
*/
var REFRESH_TOKENS = {};
REFRESH_TOKENS[ALICE_EMAIL] =
    '1/1BQUvs6QycWFn3CnL-JnmTP6OLl_eDBaIRVf4Kgky4AMEudVrK5jSpoR30zcRFq6';
REFRESH_TOKENS[BOB_EMAIL] =
    '1/ZjOcjJskQWyR6mp8L1VpuaR72p4-qVUfJFVfqNlwBc4';

// Wrapper for AJAX request, returns a promise to be fulfilled with the
// response (expected to be in JSON format).
function ajax(method, url, data) {
  return new Promise(function(F, R) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function() { F(JSON.parse(this.response)); };
    xhr.send(data);
  });
}

var REDIRECT_URL = 'https://www.uproxy.org/oauth-redirect-uri';
var CLIENT_ID =
    '746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com';

// Next access token to be returned by OAuthView.launchAuthFlow
var pendingAccessToken = null;

// Replace default OAuthView with a view that sets the access_token to
// pendingAccessToken
var OAuthView = function() {};
OAuthView.prototype.initiateOAuth = function(redirectURIs, continuation) {
  continuation({redirect: REDIRECT_URL, state: ''});
  return true;
};
OAuthView.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  if (!pendingAccessToken) {
    continuation(undefined, 'No access token found');
  } else {
    continuation(REDIRECT_URL + '?access_token=' + pendingAccessToken);
    pendingAccessToken = null;
  }
};

// Returns a Promise that fulfills with an access token.
function getAccessToken(refreshToken) {
  return new Promise(function(fulfill, resolve) {
    var data = 'refresh_token=' + refreshToken +
        '&client_id=' + CLIENT_ID +
        '&client_secret=h_hfPI4jvs9fgOgPweSBKnMu' +
        '&grant_type=refresh_token';
    ajax('POST', 'https://www.googleapis.com/oauth2/v3/token', data)
        .then(function(resp) {
          fulfill(resp.access_token);
        });
  });
}

// Returns a promise that fulfills when socialClient has been logged in
// using the loginEmail address.  loginEmail must have an associated
// refresh token.
function loginAs(socialClient, loginEmail) {
  var refreshToken = REFRESH_TOKENS[loginEmail.toLowerCase()];
  if (!refreshToken) {
    return Promise.reject('No refresh token found for ' + loginEmail);
  } else if (pendingAccessToken) {
    return Promise.reject('loginAs cannot be called concurrently.' +
        '  Please wait until previous login completes');
  }
  return getAccessToken(refreshToken).then(function(accessToken) {
    // Set the accessToken to pendingAccessToken so that it can be used by
    // our OAuthView.
    pendingAccessToken = accessToken;
    return socialClient.login({
        agent: 'integration',
        version: '0.1',
        url: '',
        interactive: false,
        rememberLogin: false
      });
  });
}

// Sets up an onClientState listener and fulfills the returned Promise
// when the given userId appears as ONLINE.
function waitForUser(socialClient, userId) {
  return new Promise(function(fulfill, reject) {
    socialClient.on('onClientState', function(clientState) {
      if (clientState.userId == userId &&
          clientState.status == 'ONLINE') {
        fulfill(clientState);
      }
    });
  });
}

describe('GTalk', function() {
  var socialInterface;

  // Message to be sent between peers.  If a unique message is not used,
  // messages from one persons test might interfere with another person who
  // is running the same tests at the same time.
  var uniqueMsg = Math.random().toString();

  function logoutThenDone(socialClientsArray, done) {
    var promises = [];
    for (var i = 0; i < socialClientsArray.length; ++i) {
      promises.push(socialClientsArray[i].logout());
    }
    Promise.all(promises).then(done);
  }

  beforeEach(function(done) {
    if (!socialInterface) {
      freedom('scripts/dist/social.google.json',
          {oauth: [OAuthView], debug: 'log'})
          .then(function(interface) {
        // Store socialInterface so we don't have to reload freedom
        // before each test.
        socialInterface = interface;
        done();
      }.bind(this));
    } else {
      done();
    }
  }.bind(this));

  it('Can login and logout', function(done) {
    var socialClient = socialInterface();
    loginAs(socialClient, ALICE_EMAIL).then(function(clientInfo) {
      expect(clientInfo.userId).toEqual(ALICE_EMAIL);
      expect(clientInfo.clientId).toEqual(ALICE_EMAIL + '/integration');
      expect(clientInfo.status).toEqual('ONLINE');
      logoutThenDone([socialClient], done);
    });
  });

  it('Can send messages', function(done) {
    // 1st login as Alice.
    var aliceSocialClient = socialInterface();
    loginAs(aliceSocialClient, ALICE_EMAIL).then(function(aliceClientInfo) {
      // Next setup a listener to send Bob messages when he is online
      waitForUser(aliceSocialClient, BOB_ANONYMIZED_ID)
          .then(function(clientState) {
        aliceSocialClient.sendMessage(clientState.clientId, uniqueMsg);
      });

      // Next login as Bob and monitor for messages.
      var bobSocialClient = socialInterface();
      loginAs(bobSocialClient, BOB_EMAIL).then(function(bobClientInfo) {
        bobSocialClient.on('onMessage', function(messageData) {
          if (messageData.from.userId == ALICE_ANONYMIZED_ID &&
              messageData.message == uniqueMsg) {
            logoutThenDone([aliceSocialClient, bobSocialClient], done);
          }
        });  // end of bobSocialClient.on('onMessage', ...
      });  // end of loginAs(bob...)
    });  // end of loginAs(alice...)
  });

  // We should be able to send 8 messages per second from one peer to another
  // without being throttled by GTalk (i.e. we should not get 503 "service
  // unavailable" errors).
  it('Can send 8 messages per second', function(done) {
    var NUM_MESSAGES_PER_SECOND = 8;
    // Defined in socialprovider.js
    // TODO: make this a constant available to users of the freedom social
    // provider object
    var BATCH_INTERVAL_MS = 100;
    // We should wait 10ms longer than the message batching frequency
    // to ensure that every message is sent individually.
    var MESSAGE_FREQUENCY = BATCH_INTERVAL_MS + 10;

    // 1st login as Alice.
    var aliceSocialClient = socialInterface();
    loginAs(aliceSocialClient, ALICE_EMAIL).then(function(aliceClientInfo) {
      // Next setup a listener to send Bob messages when he is online
      waitForUser(aliceSocialClient, BOB_ANONYMIZED_ID)
          .then(function(clientState) {
        for (var i = 1; i <= NUM_MESSAGES_PER_SECOND; ++i) {
          setTimeout(function() {
            aliceSocialClient.sendMessage(clientState.clientId, uniqueMsg);
          }, MESSAGE_FREQUENCY * i);
        }
      });

      // Next login as Bob and monitor for messages.
      var bobSocialClient = socialInterface();
      loginAs(bobSocialClient, BOB_EMAIL).then(function(bobClientInfo) {
        var receivedMessageCount = 0;
        bobSocialClient.on('onMessage', function(messageData) {
          if (messageData.from.userId == ALICE_ANONYMIZED_ID &&
              messageData.message == uniqueMsg) {
            // Keep this trace so we know how many messages are received
            // in case of failure.
            console.log('received message');
            if (++receivedMessageCount == NUM_MESSAGES_PER_SECOND) {
              logoutThenDone([aliceSocialClient, bobSocialClient], done);
            }
          }
        });  // end of bobSocialClient.on('onMessage', ...
      });  // end of loginAs(bob...)
    });  // end of loginAs(alice...)
  });
});
