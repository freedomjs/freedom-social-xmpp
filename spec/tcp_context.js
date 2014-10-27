var exports = {};
var freedom = {
  'core.tcpsocket': function() {
    "use strict";
    return {
      on: function() {},
      write: function() { return Promise.resolve(); },
      prepareSecure: function() { return Promise.resolve(); }
    };
  }
};
