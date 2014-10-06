var exports = {};
var freedom = {
  'core.tcpsocket': function() {
    return {
      on: function() {},
      write: function() { return Promise.resolve(); },
      prepareSecure: function() { return Promise.resolve(); }
    };
  }
};
