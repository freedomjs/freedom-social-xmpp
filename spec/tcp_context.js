var exports = {};
var events = {};
var freedom = {
  'core.tcpsocket': function() {
    "use strict";
    return {
      on: function(eventName, handler) {
        events[eventName] = handler;
      },
      write: function() { return Promise.resolve(); },
      prepareSecure: function() { return Promise.resolve(); }
    };
  }
};
