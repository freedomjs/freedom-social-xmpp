/*globals freedom:true,setTimeout,VCardStore,XMPPSocialProvider */
/*jslint indent:2,white:true,sloppy:true */

XMPPSocialProvider.prototype.oAuthRedirectUris = [
  "https://fmdppkkepalnkeommjadgbhiohihdhii.chromiumapp.org/",
  "https://www.uproxy.org/oauth-redirect-uri",
  "http://freedomjs.org/",
  'http://localhost:8080/'
];
XMPPSocialProvider.prototype.oAuthClientId = "746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com";
XMPPSocialProvider.prototype.oAuthScope = "email%20profile%20https://www.googleapis.com/auth/googletalk&";

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
    this.oauth = freedom["core.oauth"]();
    this.oauth.initiateOAuth(this.oAuthRedirectUris).then(function(stateObj) {
      var oauthUrl = "https://accounts.google.com/o/oauth2/auth?" +
               "client_id=" + this.oAuthClientId +
               "&scope=" + this.oAuthScope +
               "&redirect_uri=" + encodeURIComponent(stateObj.redirect) + 
               "&state=" + encodeURIComponent(stateObj.state) +
               "&response_type=token";
      var url = 'https://accounts.google.com/accountchooser?continue=' +
          encodeURIComponent(oauthUrl);
      return this.oauth.launchAuthFlow(url, stateObj);
    }.bind(this)).then(function(continuation, responseUrl) {
      var token = responseUrl.match(/access_token=([^&]+)/)[1];
      var xhr = freedom["core.xhr"]();
      xhr.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.on("onload", function(continuation, token, xhr) {
        xhr.getResponseText().then(function(continuation, token, responseText) {
          var response = JSON.parse(responseText);
          var credentials = {
            userId: response.email,
            jid: response.email,
            oauth2_token: token,
            oauth2_auth: 'http://www.google.com/talk/protocol/auth',
            host: 'talk.google.com'
          };
          this.logger.log('Got googletalk credentials: ' + JSON.stringify(credentials));
          this.onCredentials(continuation, {cmd: 'auth', message: credentials});
        }.bind(this, continuation, token));
      }.bind(this, continuation, token, xhr));
      xhr.send();
    }.bind(this, continuation)).catch(function (continuation, err) {
      this.logger.error(err);
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
