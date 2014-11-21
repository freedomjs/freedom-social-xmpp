/*globals freedom:true,setTimeout,console,VCardStore,XMPPSocialProvider */
/*jslint indent:2,white:true,sloppy:true */

XMPPSocialProvider.prototype.oAuthRedirectUris = [
  "https://fmdppkkepalnkeommjadgbhiohihdhii.chromiumapp.org/",
  //'http://localhost/*',
  //'http://freedomjs.org/',
];
XMPPSocialProvider.prototype.oAuthClientId = "746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com";

/**
 * Begin the login view, potentially prompting for credentials.
 * @method login
 * @param {Object} loginOpts Setup information about the desired network.
 *   keys used by this provider include
 *   agent - The user agent to expose on the network
 *   url - The url of the client connecting
 *   version - The version of the client.
 *   network - A string used to differentiate this provider in events.
 */
XMPPSocialProvider.prototype.login = function(loginOpts, continuation) {
  if (loginOpts) {
    this.loginOpts = loginOpts;
  }

  if (!this.credentials) {
    if (this.view) {
      this.view.close();
    }

    this.oauth = freedom["core.oauth"]();
    this.oauth.initiateOAuth(this.oAuthRedirectUris).then(function(stateObj) {
      var url = "https://accounts.google.com/o/oauth2/auth?" +
               "client_id=" + this.oAuthClientId + "&" +
               "response_type=token&" +
               "scope=" + "email%20profile%20https://www.googleapis.com/auth/googletalk&" +
               "redirect_uri=" + encodeURIComponent(stateObj.redirect) + "&" +
               "state=" + encodeURIComponent(stateObj.state);
      return this.oauth.launchAuthFlow(url, stateObj);
    }.bind(this)).then(function(continuation, responseUrl) {
      var token = responseUrl.match(/access_token=([^&]+)/)[1];
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.onload = function(continuation, token, xhr) {
        var response = JSON.parse(xhr.response);
        var credentials = {
          userId: response.email,
          jid: response.email,
          oauth2_token: token,
          oauth2_auth: 'http://www.google.com/talk/protocol/auth',
          host: 'talk.google.com'
        };
        console.log('Got googletalk credentials: ' + JSON.stringify(credentials));
        this.onCredentials(continuation, {cmd: 'auth', message: credentials});
      }.bind(this, continuation, token, xhr);
      xhr.send();
    }.bind(this, continuation)).catch(function (continuation, err) {
      console.error(err);
      continuation(undefined, {
        errcode: 'LOGIN_OAUTHERROR',
        message: err.message
        //message: this.ERRCODE.LOGIN_OAUTHERROR
      });
    }.bind(this, continuation));
    return;
  } 

  if (!this.client) {
    this.initializeState();
  }
  this.connect(continuation);
};
