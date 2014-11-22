var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var self = require("sdk/self");
const {Cu} = require("chrome");

Cu.import(self.data.url('freedom-for-firefox.jsm'));

var button = buttons.ActionButton({
  id: "google-demo",
  label: "Google demo",
  icon: {
    "16": "./demo-256.png",
    "32": "./demo-256.png",
    "64": "./demo-256.png"
  },
  onClick: handleClick
});

var chat;
var displayWorker;

function handleClick(state) {
  if (!chat) {
    freedom(self.data.url('demo.json')).then(function(constructor) {
      chat = constructor(0);
    });
  }

  tabs.open({
    url: self.data.url("main.html"),
    onLoad: function onLoad(tab) {
      displayWorker = tab.attach({
        contentScriptFile : [
          self.data.url("ux.js")
        ]
      });
      require("listen.js").setupListeners(chat, displayWorker);
    }
  });
}

