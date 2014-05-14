describe('Login integration', function() {
  var freedom;

  beforeEach(function() {
    freedom = require('freedom-for-node').freedom;
  });

  it('sees presence between two friends', function(done) {
    var socialClient = freedom('freedom.json', {debug:true});
    socialClient.emit('relay', 'onUserProfile');
    
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
