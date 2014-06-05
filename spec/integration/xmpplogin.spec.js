var credentials = [];
var CredentializingView = function(caller, dispatch) {
  this.dispatchEvent = dispatch;
};

CredentializingView.prototype.open = function(view, opts, continuation) {
  continuation();
};

CredentializingView.prototype.show = function(continuation) {
  continuation();
  if (credentials.length) {
    this.dispatchEvent('message', credentials.pop());
  }
};

CredentializingView.prototype.close = function(continuation) {
  continuation();
};

describe('Login integration', function() {
  var freedom, acct;

  beforeEach(function() {
    freedom = require('freedom-for-node').freedom;
    expect(freedom).toBeDefined();
    expect(fdom.link.Node).toBeDefined();

    fdom.apis.register('core.view', CredentializingView);
    var credential = (process.env.XMPPACCT || "alice:hiimalice").split(":");
    acct = {
      userId: credential[0] + '@xmpp.uproxy.org',
      password: credential[1]
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
