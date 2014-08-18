// TODO: don't forget to hack node-xmpp-browser.js for the usable SASL mechanism thing.

var tabs = require("sdk/tabs");
var self = require("sdk/self");
const {XMLHttpRequest} = require("sdk/net/xhr");

console.error('dborkan: view_facebookauth.js loaded!');

// TODO: should this really be global?
var CREDENTIALS = "";

var FACEBOOK_APP_ID = '161927677344933';
var FACEBOOK_TOKENINFO_URL = 'https://graph.facebook.com/me?access_token=';
var FACEBOOK_OAUTH_SCOPES = 'email,xmpp_login,user_online_presence,friends_online_presence';
var REDIRECT_URI = "https://www.uproxy.org/";


var View_facebookAuth = function (app, dispatchEvent) {
  console.error('dborkan: in View_facebookAuth constructor!');
  this.dispatchEvent = dispatchEvent;
  this.app = app;
};

View_facebookAuth.prototype.open = function (name, what, continuation) {
  console.error('dborkan: in View_facebookAuth.prototype.open!');
  continuation(false);
};

View_facebookAuth.prototype.show = function (continuation) {
  console.error('dborkan: in View_facebookAuth.prototype.show!');
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
  console.error('dborkan: opening facebookUrl: ' + facebookUrl);
  tabs.open({
    url: facebookUrl,
    isPrivate: true,
    onLoad: function onLoad(tab) {
      var responseUrl = tab.url;
      console.error('dborkan: got responseUrl ' + responseUrl);
      if (!responseUrl.startsWith(REDIRECT_URI)) {
        // TODO: what to do here?
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
          console.error('dborkan: got credentials! ' + CREDENTIALS);
          dispatchEvent('message', {cmd: 'auth', message: CREDENTIALS});
          continuation();
        }).catch(function(e) {
          console.error('dborkan: error getting jid ' + e);
          // TODO: invoke error, continuation?
        });
      } else {
        console.error('dborkan: access_token not found');
        // TODO: invoke error, continuation?
      }
      tab.close();
    }  // end of onLoad
 });  // end of tabs.open
}

function getJid(accessToken) {
  return new Promise(function (F, R) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', (function() {
      if (xhr.status == 200) {
        console.error('dborkan: responseText is ' + xhr.responseText);
        var resp = JSON.parse(xhr.responseText);
        console.error('dborkan: resp is ' + resp);
        F('-' + resp.id + '@chat.facebook.com');
      } else {
        console.error('dborkan: Error validating Facebook oAuth token');
        R(new Error('Error validating Facebook oAuth token'));
      }
    }).bind(this), false);
    xhr.addEventListener('error', (function() {
      console.error('dborkan: Error occurred while validating Facebook oAuth token');
      R(new Error('Error occurred while validating Facebook oAuth token'));
    }).bind(this), false);
    xhr.open('get', FACEBOOK_TOKENINFO_URL + accessToken, true);
    console.error('dborkan: sending request for jid');
    xhr.send();
  });
};

exports.View_facebookAuth = View_facebookAuth;
console.error('dborkan: at the end of view_facebookauth.js!');