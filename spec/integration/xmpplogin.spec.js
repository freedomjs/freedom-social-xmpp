/*jshint node:true*/
/* global describe, it, beforeEach, afterEach, expect, spyOn*/
/* global fdom*/

var credentials = [];
var CredentializingView = function(caller, dispatch) {
  "use strict";
  this.dispatchEvent = dispatch;
};

CredentializingView.prototype.open = function(view, opts, continuation) {
  "use strict";
  continuation();
};

CredentializingView.prototype.show = function(continuation) {
  "use strict";
  continuation();
  if (credentials.length) {
    this.dispatchEvent('message', credentials.pop());
  }
};

CredentializingView.prototype.close = function(continuation) {
  "use strict";
  continuation();
};

describe('Login integration', function() {
  "use strict";
  var freedom, acct;

  beforeEach(function() {
    freedom = require('freedom-for-node').freedom;
    expect(freedom).toBeDefined();

    fdom.apis.register('core.view', CredentializingView);
    var credential = (process.env.XMPPACCT || "alice:hiimalice").split(":");
    acct = {
      userId: credential[0] + '@xmpp.uproxy.org',
      password: credential[1],
      disallowTLS: true
    };
  });

  it('logs in', function(done) {
    var socialClient = freedom('freedom.json', {debug:true});
    socialClient.emit('relay', 'onClientState');
    
    credentials.push({
      cmd: 'auth',
      message: acct
    });
                       
    socialClient.emit('login', [{
      agent: 'integration',
      version: '0.1',
      url: '',
      interactive: false,
      rememberLogin: false
    }]);
    
    socialClient.on('onClientState', function(prof) {
      expect(prof.status).toEqual('ONLINE');
      done();
    });
  });
});
