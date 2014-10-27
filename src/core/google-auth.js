XMPPSocialProvider.prototype.oAuthRedirectUris = [
  'http://localhost',
  'http://freedomjs.org/',
];
XMPPSocialProvider.prototype.oAuthClientId = "871734945364-oigtiha0jsda8bouc4n9rt2g7c0smhtj.apps.googleusercontent.com";
/*globals freedom:true,setTimeout,console,VCardStore,XMPPSocialProvider */
/*jslint indent:2,white:true,sloppy:true */

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

    this.view = freedom['core.view']();
    //this.view.once('message', this.onCredentials.bind(this, continuation));
    this.view.on('message', function(obj) {
      console.warn('Unexpected from core.view: ' + JSON.stringify(obj));
    });

    this.oauth = freedom['core.oauth']();
    this.oauth.on('oAuthEvent', this.onOAuthEvent.bind(this));
    this.view.open('GoogleLogin', {file: 'google-view.html'})
      .then(this.view.show.bind(this.view))
      .then(this.oauth.initiateOAuth.bind(this.oauth, this.oAuthRedirectUris))
      .then(function(obj) {
        this.view.postMessage({
          url: "https://accounts.google.com/o/oauth2/auth?" +
               "client_id=" + this.oAuthClientId + "&" +
               "response_type=token&" +
               "scope=" + "email%20profile%20https://www.googleapis.com/auth/googletalk&" +
               "redirect_uri=" + encodeURIComponent(obj.redirect) + "&" +
               "state=" + encodeURIComponent(obj.state);
        });
      })
      .catch(function (err) {
        continuation(undefined, {
          errcode: 'LOGIN_OAUTHERROR',
          message: this.ERRCODE.LOGIN_OAUTHERROR
        });
      });
    return;
  } 

  if (!this.client) {
    this.initializeState();
  }
  this.connect(continuation);
};

XMPPSocialProvider.prototype.onOAuthEvent = function(url) {
  console.log("!!!");
  console.log(url);
  var query = url.substr(url.indexOf('#') + 1);
  var param;
  var params = {};
  var keys = query.split('&');
  var i = 0;
  var xhr = new XMLHttpRequest();

  for (i = 0; i < keys.length; i += 1) {
    param = keys[i].substr(0, keys[i].indexOf('='));
    params[param] = keys[i].substr(keys[i].indexOf('=') + 1);
  }
  console.log(params);
  
  // https://developers.google.com/api-client-library/javascript/features/cors
  // claims that googleapis.com supports CORS Headers. This is a lie.
  // However, undocumented everywere is the fact that the endpoint API does
  // support JSONP, which can also be used (though not super gracefully)
  // with freedom.js modules.
  //importScripts("https://www.googleapis.com/userinfo/v2/me?" +
  //              "callback=onProfile&" +
  //              "access_token=" + params.access_token);

};
