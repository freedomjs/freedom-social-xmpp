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
  var freedom;

  beforeEach(function() {
    freedom = require('freedom-for-node').freedom;
    console.log(fdom.link.Node);
    fdom.apis.register('core.view', CredentializingView);
  });

  it('logs in', function(done) {
    var socialClient = freedom('freedom.json', {debug:true});
    socialClient.emit('relay', 'onUserProfile');
    
    credentials.push({
      cmd: 'auth',
      message: {
        userId: 'alice@xmpp.uproxy.org',
        password: 'test'
      }
    });
                       
    socialClient.emit('login', [{
      agent: 'integration',
      version: '0.1',
      url: '',
      interactive: false,
      rememberLogin: false
    }]);
    
    socialClient.on('onUserProfile', function(prof) {
      done();
    });
  });
});
