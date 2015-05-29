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
XMPPSocialProvider.prototype.clientSecret = "h_hfPI4jvs9fgOgPweSBKnMu";

// These credentials are for a native app..  but we can't change the redirect URL.
// XMPPSocialProvider.prototype.oAuthClientId = "746567772449-mv4h0e34orsf6t6kkbbht22t9otijip0.apps.googleusercontent.com";
// XMPPSocialProvider.prototype.clientSecret = "M-EGTuFRaWLS5q_hygpJZMBu";

/**
 * Begin the login view, potentially prompting for credentials.
 * @method login
 * @param {Object} loginOpts Setup information about the desired network.
 *   keys used by this provider include
 *   agent - The user agent to expose on the network
 *   url - The url of the client connecting
 *   version - The version of the client.
 *   network - A string used to differentiate this provider in events.
 *   interactive - Login will attempt to re-use the last remembered
 *       login credentials if this is set to false.
 *   rememberLogin: Login credentials will be cached if true.
 */
XMPPSocialProvider.prototype.login = function(loginOpts, continuation) {
  // TODO: my logic is going to break social providers who want to re-use credentials
  // that's why I need to revert to the old logic that checked this.credentials

  if (!loginOpts) {
    continuation(undefined, {
      errcode: 'LOGIN_OAUTHERROR',
      message: 'loginOpts must be defined'
    });
    return;
  } else if (loginOpts.interactive && !loginOpts.rememberLogin) {
    // freedom-social-xmpp no longer supports old login logic, where user
    // would go through an interactive OAuth flow to just get an access_token.
    // Now anytime interactive==true, rememberLogin must be true, so that
    // we can get a refresh_token.
    continuation(undefined, {
      errcode: 'LOGIN_OAUTHERROR',
      message: 'rememberLogin must be true if interactive is true'
    });
    return;
  }

  this.loginOpts = loginOpts;

  var getRefreshTokenPromise;
  if (loginOpts.interactive) {
    getRefreshTokenPromise = this.getRefreshTokenInteractive_();
  } else {
    getRefreshTokenPromise = this.loadMostRecentRefreshToken_();
  }

  getRefreshTokenPromise.then(function(refreshToken) {
    if (this.loginOpts.rememberLogin) {
      this.saveMostRecentRefreshToken_(refreshToken);
    }
    this.logger.error('in login, got refreshToken: ' + refreshToken);
    // TODO: optimize to not make the getEmail XHR twice
    this.getAccessToken_(refreshToken).then(function(accessToken) {
      this.getCredentials_(accessToken).then(function(credentials) {
        this.onCredentials(continuation, {cmd: 'auth', message: credentials});
      }.bind(this));
    }.bind(this));
  }.bind(this)).catch(function(e) {
    this.logger.error('Error getting refreshToken: ', e);
    continuation(undefined, {
      errcode: 'LOGIN_OAUTHERROR', message: 'Error getting refreshToken: ' + e
    });
  });
};





/**
  Open Google account chooser to let the user pick an account, then request a
  refresh token.  Possible outcomes:
  1. Google gives us a refresh token after closing the oauth window, all good
  2. Google does not give us a refresh token after closing the oauth window,
    in this case we should use the access token to get the user's email,
    and see if we already have a refresh token stored for that email address.
  2a. If we have a refresh token for that email address, return it.
  2b. If we don't have a refresh token for that email address, we will have to
    launch another oauth window which with "approval_prompt=force", so that
    the user grants us "offline access" again and we can get a refresh token
 */
XMPPSocialProvider.prototype.getRefreshTokenInteractive_ = function() {
  // TODO: optimize by always setting force=true if no refresh token exists yet

  // First try to get a refresh token via the account chooser
  return new Promise(function(fulfill, reject) {
    this.tryToGetRefreshToken_(false, null).then(function(responseObj) {
      this.logger.error('1st tryToGetRefreshToken_ returned ' + JSON.stringify(responseObj));
      if (!responseObj.access_token) {
        reject(new Error('Could not find access_token'));
      }
      this.getEmail_(responseObj.access_token).then(function(email) {
        this.logger.error('email: ' + email);

        if (responseObj.refresh_token) {
          this.saveRefreshTokenForEmail_(email, responseObj.refresh_token);
          fulfill(responseObj.refresh_token);
          return;
        }
        // If no refresh_token is returned, it may mean that the user has already
        // granted this app a refresh token.  We should first check to see if we
        // already have a refresh token stored for this user, and if not we should
        // prompt them again with approval_prompt=force to ensure we get a refresh
        // token.
        // Note loadRefreshTokenForEmail_ will fulfill with null if there is
        // no refresh token saved.
        this.loadRefreshTokenForEmail_(email).then(function(refreshToken) {
          this.logger.error('loadRefreshTokenForEmail_ returned: ' + refreshToken);
          if (refreshToken) {
            fulfill(refreshToken);
            return;
          }
          // No refresh token was returned to us, or has been stored for this
          // email address (this would happen if the user already granted us
          // a token but re-installed the chrome app).  Try again forcing
          // the approval prompt for this email address.
          this.tryToGetRefreshToken_(true, email).then(function(responseObj) {
            this.logger.error('2nd tryToGetRefreshToken_ returned: ' + JSON.stringify(responseObj));
            if (responseObj.refresh_token) {
              this.saveRefreshTokenForEmail_(email, responseObj.refresh_token);
              fulfill(responseObj.refresh_token);
            } else {
              reject(new Error('responseObj does not contain refresh_token'));
            }
          }.bind(this)).catch(function(error) {
            reject(new Error('Failed to get refresh_token with forcePrompt'));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }.bind(this));
};


XMPPSocialProvider.prototype.saveRefreshTokenForEmail_ =
    function(email, refrehToken) {
  this.storage.set('Google-Refreh-Token:' + email, refrehToken);
};


XMPPSocialProvider.prototype.loadRefreshTokenForEmail_ = function(email) {
  return this.storage.get('Google-Refreh-Token:' + email);
};


XMPPSocialProvider.prototype.saveMostRecentRefreshToken_ =
    function(refrehToken) {
  this.storage.set('Google-Refreh-Token-MostRecent', refrehToken);
};


XMPPSocialProvider.prototype.loadMostRecentRefreshToken_ = function() {
  return this.storage.get('Google-Refreh-Token-MostRecent');
};


// TODO: this is resulting in 2 XHRs... can I just keep/save the email?
XMPPSocialProvider.prototype.getCredentials_ = function(accessToken) {
  return this.getEmail_(accessToken).then(function(email) {
    return {
      userId: email,
      jid: email,
      oauth2_token: accessToken,
      oauth2_auth: 'http://www.google.com/talk/protocol/auth',
      host: 'talk.google.com'
    };
  }.bind(this));
};


XMPPSocialProvider.prototype.getEmail_ = function(accessToken) {
  return new Promise(function(fulfill, reject) {
    var xhr = freedom["core.xhr"]();
    xhr.open('GET', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json', true);
    xhr.on("onload", function() {
      xhr.getResponseText().then(function(responseText) {
        // TODO: error handling
        fulfill(JSON.parse(responseText).email);
      }.bind(this));
    }.bind(this));
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.send();
  }.bind(this));
};






// TODO: use core.xhr everywhere
XMPPSocialProvider.prototype.getCode_ = function(
    oauth, stateObj, forcePrompt, authUserEmail) {
  var getCodeUrl = 'https://accounts.google.com/o/oauth2/auth?' +
           'response_type=code' +
           '&access_type=offline' +
           '&client_id=' + this.oAuthClientId +
           '&scope=' + this.oAuthScope +
           (forcePrompt ? '&approval_prompt=force' : '') +
           '&redirect_uri=' + encodeURIComponent(stateObj.redirect) +
           '&state=' + encodeURIComponent(stateObj.state);
  this.logger.error('getCodeUrl: ' + getCodeUrl);

  var url;
  if (authUserEmail) {
    // Skip account chooser and set the authuser param
    url = getCodeUrl + '&authuser=' + authUserEmail;
  } else {
    // Got to account chooser.
    url = 'https://accounts.google.com/accountchooser?continue=' +
        encodeURIComponent(getCodeUrl);
  }
  this.logger.error('url: ' + url);   // TODO: remove all extra error trace

  return oauth.launchAuthFlow(url, stateObj).then(function(responseUrl) {
    // TODO: remove
    this.logger.error('got responseUrl in getCode_: ' + responseUrl);
    return responseUrl.match(/code=([^&]+)/)[1];
  }.bind(this));
};

XMPPSocialProvider.prototype.tryToGetRefreshToken_ = function(
    forcePrompt, authUserEmail) {
  return new Promise(function(fulfill, reject) {
    var oauth = freedom["core.oauth"]();
    return oauth.initiateOAuth(this.oAuthRedirectUris).then(function(stateObj) {
      this.getCode_(
          oauth, stateObj, forcePrompt, authUserEmail).then(function(code) {
        var data = 'code=' + code +
            '&client_id=' + this.oAuthClientId +
            '&client_secret=' + this.clientSecret +
            "&redirect_uri=" + encodeURIComponent(stateObj.redirect) +
            '&grant_type=authorization_code';
        // TODO: use core.xhr
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://www.googleapis.com/oauth2/v3/token', true);
        xhr.setRequestHeader(
            'content-type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
          // TODO: error checking?
          fulfill(JSON.parse(this.response));
        };
        xhr.send(data);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

XMPPSocialProvider.prototype.getAccessToken_ = function(refreshToken) {
  return new Promise(function(fulfill, resolve) {
    var data = 'refresh_token=' + refreshToken +
        '&client_id=' + this.oAuthClientId +
        '&client_secret=' + this.clientSecret +
        '&grant_type=refresh_token';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/oauth2/v3/token', true);
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
      // TODO: error handling
      fulfill(JSON.parse(this.response).access_token);
    };
    xhr.send(data);
  }.bind(this));
};
