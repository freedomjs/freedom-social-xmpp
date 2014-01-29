/**
 * Implementation of a Social provider for freedom.js that
 * uses sockets to make xmpp connections to chat networks.
 **/

var social = freedom.social();
var window = {};
var socket = freedom['core.socket']();
var view = freedom['core.view']();
var NETWORK_ID = 'xmpp';
var NETWORK_NAME = 'Generic XMPP Identity Provider';
var DEFAULT_XMPP_PORT = 5222;

/**
 * The SocialProvider implements the freedom.js social API
 * It wraps an XMPP Client, and handles freedom-specific
 * interactions like authentication.
 */
var SocialProvider = function() {
  this.client = null;
  this.credentials = null;
  this.id = null;
  setTimeout(this.updateStatus.bind(this, 'OFFLINE', 'offline'), 0);
  
  this.profile = {
    me: {},
    roster: {}
  };
};

SocialProvider.prototype.login = function(loginOpts, continuation) {
  if (!this.credentials) {
    view.once('message', this.finishLogin.bind(this, loginOpts, continuation));
    view.open('SocialLogin', {file: 'login.html'}).done(function() {
      view.show();
    });
  }
};

SocialProvider.prototype.finishLogin = function(loginOpts, continuation, msg) {
  this.credentials = msg;
  view.close();
  this.updateStatus('OFFLINE', 'Logging In');
  // TODO(willscott): Support more broad login methods.
  var connectOpts = {
    xmlns:'jabber:client',
    jid: msg.un,
    password: msg.pw,
    disallowTLS: true
  };
  this.client = new window.XMPP.Client(connectOpts);
  this.client.addListener('online', function() {
    console.warn('client online!');
  }.bind(this));
  this.client.addListener('error', function(e) {
    console.error('XMPP error occured: ', e);
  }.bind(this));
  this.client.addListener('stanza', function(m) {
    console.log('xmpp stanza received: ', m);
  }.bind(this));
};

SocialProvider.prototype.getRoster = function(continuation) {
  continuation(this.roster);
};

SocialProvider.prototype.sendMessage = function(to, msg, continuation) {
};

SocialProvider.prototype.logout = function(logoutOpts, continuation) {
};

SocialProvider.prototype.updateStatus = function(status, msg) {
  var message = {
    network: NETWORK_ID,
    userId: this.id,
    clientId: this.id,
    status: social.STATUS_NETWORK[status],
    message: msg
  };
  this.dispatchEvent('onStatus', message);
  return message;
};

social.provideAsynchronous(SocialProvider);
