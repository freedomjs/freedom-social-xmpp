var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var self = require("sdk/self");
const {Cu} = require("chrome");

Cu.import(self.data.url('freedom-for-firefox.jsm'));

var button = buttons.ActionButton({
  id: "facebook-demo",
  label: "Facebook demo",
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
      setupFreedom(manifest, {
        // this is needed to see output trace in Developer Console printed from
        // freedom workers (main-freedom-worker.js)
        //portType: "BackgroundFrame",
        freedomcfg:function(register) {
          register('core.view', require('view_facebookauth.js').View_facebookAuth);
        }
      });
  tabs.open({
    url: self.data.url("../lib/tab.html"),
    onLoad: function onLoad(tab) {
      displayWorker = tab.attach({
        contentScriptFile : [
          self.data.url("ux.js")]
      });
      displayWorker.port.emit("setUp");
      require("listen.js").setupListeners(freedom, displayWorker);
    }
  });
}

