var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var self = require("sdk/self");
const {Cu} = require("chrome");

Cu.import(self.data.url('freedom-for-firefox.jsm'));

var button = buttons.ActionButton({
  id: "google-demo",
  label: "Google demo",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onClick: handleClick
});

function handleClick(state) {
  var manifest = self.data.url('demo.json');
  var freedom =
      setupFreedom(manifest, {freedomcfg:function(register) {
        register('core.view', require('view_googleauth.js').View_googleAuth);
      }});
  tabs.open({
    url: self.data.url("../lib/tab.html"),
    onLoad: function onLoad(tab) {
      displayWorker = tab.attach({
        contentScriptFile : [
          self.data.url("../lib/display.js")]
      });
      displayWorker.port.emit("setUp");
      require("listen.js").setupListeners(freedom, displayWorker);
    }
  });
}

