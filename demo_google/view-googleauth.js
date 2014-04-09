'use strict';

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
  var url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';
  chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
    if (chrome.runtime.lastError) {
      // TODO: is this needed?  does this ever get hit?
      console.log('found lastError');
    } else {
      console.log('Got Oauth2 token:' + token);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
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
    }
  });
};

View_googleAuth.prototype.postMessage = function (args, continuation) {
  // TODO: is this needed?
  //this.win.contentWindow.postMessage(args, '*');
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
