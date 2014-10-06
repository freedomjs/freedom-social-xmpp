var CREDENTIALS = "";

var FACEBOOK_APP_ID = '161927677344933';
var FACEBOOK_TOKENINFO_URL = 'https://graph.facebook.com/me?access_token=';
var FACEBOOK_OAUTH_SCOPES = 'email,xmpp_login,user_online_presence,friends_online_presence';
var REDIRECT_URI = chrome.identity.getRedirectURL();


var View_facebookAuth = function (app, dispatchEvent) {
  this.dispatchEvent = dispatchEvent;
  this.app = app;
};

View_facebookAuth.prototype.open = function (name, what, continuation) {
  continuation(false);
};

View_facebookAuth.prototype.show = function (continuation) {
  if (CREDENTIALS == '') {
    facebookAuth(this.dispatchEvent, continuation);
  } else {
    this.dispatchEvent('message', {cmd: 'auth', message: CREDENTIALS});
    continuation();
  }
};

View_facebookAuth.prototype.postMessage = function (args, continuation) {
  continuation();
};

View_facebookAuth.prototype.close = function (continuation) {
  continuation();
};

View_facebookAuth.prototype.onMessage = function (m) {
};

function facebookAuth(dispatchEvent, continuation) {
  var facebookUrl = 'https://www.facebook.com/dialog/oauth?' + 'client_id=' + encodeURIComponent(FACEBOOK_APP_ID) + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&scope=' + encodeURIComponent(FACEBOOK_OAUTH_SCOPES) + '&response_type=token';
  chrome.identity.launchWebAuthFlow(
    {url: facebookUrl, interactive: true},
    function (responseUrl) {
      console.log('Got responseUrl: ' + responseUrl);
      if (chrome.runtime.lastError) {
        console.log('Error logging into Facebook: ', chrome.runtime.lastError);
        return;
      }

      var query = {};
      if (responseUrl && responseUrl.indexOf('#') >= 0) {
          var queryTok = responseUrl.substr(responseUrl.indexOf('#') + 1).split('&');
          for (var i = 0; i < queryTok.length; i++) {
              var tmp = queryTok[i].split('=');
              if (tmp.length > 1) {
                  query[tmp[0]] = tmp[1];
              }
          }
      }
      console.log('query: ', query);

      //If success
      var accessToken = query['access_token'];
      if (accessToken) {
        getJid(accessToken).then(function(jid) {
          CREDENTIALS = {
            jid: jid,
            access_token: accessToken,
            api_key: '1d0d40ce6d1656650eabea427f0d0857',  // secret, not id!
            host: 'chat.facebook.com'
          };
          dispatchEvent('message', {cmd: 'auth', message: CREDENTIALS});
          continuation();
        }).catch(function(e) {
          dispatchEvent('message',
                        {cmd: 'error', message: 'Error getting JID'});
        });
      } else {
        dispatchEvent('message',
                      {cmd: 'error', message: 'Acess token not found'});
      }
  });  // end of tabs.open
}

function getJid(accessToken) {
  return new Promise(function (F, R) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', (function() {
      if (xhr.status == 200) {
        var resp = JSON.parse(xhr.responseText);
        F('-' + resp.id + '@chat.facebook.com');
      } else {
        R(new Error('Error validating Facebook oAuth token'));
      }
    }).bind(this), false);
    xhr.addEventListener('error', (function() {
      R(new Error('Error occurred while validating Facebook oAuth token'));
    }).bind(this), false);
    xhr.open('get', FACEBOOK_TOKENINFO_URL + accessToken, true);
    xhr.send();
  });
};


// Register with freedom as core.view provider.
window.freedomcfg = function(register) {
  console.log('registering View_facebookAuth');
  register("core.view", View_facebookAuth);
}
