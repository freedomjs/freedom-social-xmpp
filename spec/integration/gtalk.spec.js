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
var OAuthView = function() {};
OAuthView.prototype.initiateOAuth = function(redirectURIs, continuation) {
  continuation({redirect: REDIRECT_URL, state: ''});
  return true;
};
OAuthView.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  // Refresh token for Harry uProxy
  // TODO: get a refresh token for accounts that are only used by these tests
  // TODO: we should only use the refresh token once per test
  var refreshToken =
      '1/EuwPr8IeVQDEBhYVozNIYqkvs9kUOnKmWXTHRJb1_Rt90RDknAdJa_sgfheVM0XT';
  var data = 'refresh_token=' + refreshToken +
      '&client_id=746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com' +
      '&client_secret=h_hfPI4jvs9fgOgPweSBKnMu' +
      '&grant_type=refresh_token';
  ajax('POST', 'https://www.googleapis.com/oauth2/v3/token', data)
      .then(function(resp) {
        continuation(REDIRECT_URL + '?access_token=' + resp.access_token);
      });
};

describe('GTalk', function() {
  var socialClient;

  // TODO: is there a before once that can load the json file (async)?
  beforeEach(function(done) {
    freedom('scripts/dist/social.google.json',
        {oauth: [OAuthView], debug: 'log'})
        // {debug: 'log'})
      .then(function(interface) {
        socialClient = interface();
        done();
      }.bind(this));
  }.bind(this));

  it('Can login', function(done) {
    socialClient.login({
        agent: 'integration',
        version: '0.1',
        url: '',
        interactive: false,
        rememberLogin: false
      }).then(done);
  }.bind(this));
});
