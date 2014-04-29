'use strict';

// CLIENT_ID is from
// https://console.developers.google.com/project/746567772449/apiui/credential
// It needs to have the redirect URL from chrome.identity.getRedirectURL()
// associated with it.
var CLIENT_ID =
    '746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com';

var View_googleAuth = function (app, dispatchEvent) {
  this.dispatchEvent = dispatchEvent;
  //this.win = null;  // TODO: what was this used for?
  this.app = app;
  // TODO: this was copied from freedom's View
//  fdom.util.handleEvents(this);
  
};

View_googleAuth.prototype.open = function (name, what, continuation) {
  // Connect onMessage to properly forward auth message.
  this.app.config.global.addEventListener('message', this.onMessage.bind(this), true);
  continuation(false);  // TODO: what does this param mean?  It was copied from freedom's view
};

View_googleAuth.prototype.show = function (continuation) {

  var googleOAuth2Url = 'https://accounts.google.com/o/oauth2/auth?' +
    'response_type=token' +
    '&redirect_uri=' + chrome.identity.getRedirectURL() +
    '&client_id=' + CLIENT_ID +
    // scopes are "email" and "https://www.googleapis.com/auth/googletalk"
    // separated by a space (%20).
    '&scope=email%20https://www.googleapis.com/auth/googletalk';
  console.log('googleOAuth2Url: ' + googleOAuth2Url);
  chrome.identity.launchWebAuthFlow(
      {url: googleOAuth2Url, interactive: true},
      function(responseUrl) {
        console.log('Got responseUrl: ' + responseUrl);
        if (chrome.runtime.lastError) {
          console.log('Error logging into Google: ', chrome.runtime.lastError);
          return;
        }

        // Parse Oauth2 token from responseUrl
        var token = responseUrl.match(/access_token=([^&]+)/)[1];
        console.log('Got Oauth2 token:' + token);
        if (!token) {
          console.error('Error getting token for Google');
          return;
        }

        // Invoke userinfo API to get user's email address, then pass
        // credentials back to social provider.
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.onload = function() {
          var response = JSON.parse(this.response);
          var credentials = {
            userId: response.email,
            jid: response.email,
            oauth2_token: token,
            oauth2_auth: 'http://www.google.com/talk/protocol/auth',
            host: 'talk.google.com'
          };
          console.log('Got googletalk credentials: ' + JSON.stringify(credentials));
          parent.postMessage({cmd: 'auth', message: credentials}, '*');
          continuation();
        };
        xhr.send();
      });
};

View_googleAuth.prototype.postMessage = function (args, continuation) {
  if (args == 'logout') {
    // Logout of Google so that next time login URL is invoked user can
    // sign in with a different account.  This must be launched using
    // launchWebAuthFlow so that sandboxed environment is logged out (so
    // this can't be done using an xhr request).
    var logoutUrl = 'https://accounts.google.com/logout';
    chrome.identity.launchWebAuthFlow(
        {url: logoutUrl, interactive: false},
        function(responseUrl) {});
  } else {
    console.error('unknown postMessage: ', args);
  }
  continuation();
};

View_googleAuth.prototype.close = function (continuation) {
  continuation();
};

View_googleAuth.prototype.onMessage = function (m) {
  this.dispatchEvent('message', m.data);
};


// Register with freedom as core.view provider.
window.freedomcfg = function(register) {
  console.log('registering View_googleAuth');
  register("core.view", View_googleAuth);
}
