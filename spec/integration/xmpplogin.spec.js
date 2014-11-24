/*jshint node:true*/
/* global describe, it, beforeEach, afterEach, expect, spyOn*/

var credentials = [];
var CredentializingView = function() {
  "use strict";
  this.onOpen = function(id, name, page, resources, postMessage) {
    console.log('OPEN');
    if (credentials.length > 0) {
      postMessage(credentials.pop());
    }
  };
  this.onMessage = function(id, message) {};
  this.onClose = function(id) {};

};

describe('Login integration', function() {
  "use strict";
  var freedom, acct;

  beforeEach(function() {
    freedom = require('freedom-for-node').freedom;
    expect(freedom).toBeDefined();

    var credential = (process.env.XMPPACCT || "alice:hiimalice").split(":");
    acct = {
      userId: credential[0] + '@xmpp.uproxy.org',
      password: credential[1],
      disallowTLS: true
    };
  });

  it('logs in', function(done) {
    credentials.push({
      cmd: 'auth',
      message: acct
    });

    freedom('freedom.json', {view: CredentializingView}).then(function(SocialClient) {
      var socialClient = SocialClient();
      socialClient.emit('relay', 'onClientState');
      console.log('Logging in');
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
});
