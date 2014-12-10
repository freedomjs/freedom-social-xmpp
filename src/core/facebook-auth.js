/*globals freedom:true,setTimeout,VCardStore,XMPPSocialProvider */
/*jslint indent:2,white:true,sloppy:true */

XMPPSocialProvider.prototype.oAuthRedirectUris = [
  "https://fmdppkkepalnkeommjadgbhiohihdhii.chromiumapp.org/",
  "https://www.uproxy.org/oauth-redirect-uri",
  "http://freedomjs.org/",
  //'http://localhost/*',
];
XMPPSocialProvider.prototype.oAuthClientId = '161927677344933';
XMPPSocialProvider.prototype.oAuthScope = "email,xmpp_login,user_online_presence,friends_online_presence";
XMPPSocialProvider.prototype.oAuthAppSecret = '1d0d40ce6d1656650eabea427f0d0857';

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
      var url = "https://www.facebook.com/dialog/oauth?" + 
                  "client_id=" + encodeURIComponent(this.oAuthClientId) + 
                  "&scope=" + encodeURIComponent(this.oAuthScope) + 
                  "&redirect_uri=" + encodeURIComponent(stateObj.redirect) + 
                  "&state=" + encodeURIComponent(stateObj.state) +
                  "&response_type=token";
      return this.oauth.launchAuthFlow(url, stateObj);
    }.bind(this)).then(function(continuation, responseUrl) {
      var token = responseUrl.match(/access_token=([^&]+)/)[1];
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://graph.facebook.com/me?access_token='+token);
      xhr.onload = function(continuation, token, xhr) {
        var response = JSON.parse(xhr.responseText);
        var credentials = {
          jid: '-'+response.id+'@chat.facebook.com',
          access_token: token,
          api_key: this.oAuthAppSecret,  // secret, not id!
          host: 'chat.facebook.com'
        };
        this.logger.log('Got facebook credentials: ' + JSON.stringify(credentials));
        this.onCredentials(continuation, {cmd: 'auth', message: credentials});
      }.bind(this, continuation, token, xhr);
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
