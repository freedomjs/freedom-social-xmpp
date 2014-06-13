var tabs = require("sdk/tabs");
var self = require("sdk/self");

var CREDENTIALS = "";

var View_googleAuth = function (app, dispatchEvent) {
  this.dispatchEvent = dispatchEvent;
  this.app = app;
};

View_googleAuth.prototype.open = function (name, what, continuation) {
  continuation(false);
};

View_googleAuth.prototype.show = function (continuation) {
  if (CREDENTIALS == '') {
    googleAuth(this.dispatchEvent, continuation);
  } else {
    this.dispatchEvent('message', {cmd: 'auth', message: CREDENTIALS});
    continuation();
  }
};

View_googleAuth.prototype.postMessage = function (args, continuation) {
  continuation();
};

View_googleAuth.prototype.close = function (continuation) {
  continuation();
};

View_googleAuth.prototype.onMessage = function (m) {
};

function googleAuth(dispatchEvent, continuation) {
    tabs.open({
      url: "https://accounts.google.com/o/oauth2/auth?" +
           "scope=email%20https://www.googleapis.com/auth/googletalk" +
           "&redirect_uri=urn:ietf:wg:oauth:2.0:oob" +
           "&response_type=code" +
           "&client_id=222861774905-u4e5lp293k0hm2cbmr9iil4jk3os7i3b.apps.googleusercontent.com",
      isPrivate: true,

      onLoad: function onLoad(tab) {
        worker = tab.attach({
          contentScriptFile : [
            self.data.url("../lib/login.js")]
        });

        var title = tab.title;
        if (title.startsWith("Success")) {
          var code = title.match(/code=([^&]+)/)[1];
          worker.port.emit("getToken", code);;
        }
        worker.port.on("receiveCredentials", function(credentials) {
          tab.close();
          CREDENTIALS = credentials;
          dispatchEvent('message', {cmd: 'auth', message: credentials});
          continuation();
        });
      }
   })
}
exports.View_googleAuth = View_googleAuth;
