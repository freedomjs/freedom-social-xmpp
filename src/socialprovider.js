/**
 * Implementation of a Social provider for freedom.js that
 * uses sockets to make xmpp connections to chat networks.
 **/

var social = freedom.social();
var window = {
  socket: freedom['core.socket']()
};
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
  this.id = null;
  this.roster = {};
  setTimeout(this.updateStatus.bind(this, 'OFFLINE', 'offline'), 0);
};

SocialProvider.prototype.login = function(loginOpts, continuation) {
  view.once('message', this.finishLogin.bind(this, loginOpts, continuation));
  view.open('SocialLogin', {file: 'login.html'}).done(function() {
    view.show();
  });
};

SocialProvider.prototype.finishLogin = function(loginOpts, continuation, msg) {
  console.warn(JSON.stringify(msg));
  this.updateStatus('OFFLINE', 'Logging In');
//  var connectOpts = {
//    xmlns:'jabber:client',
//    host:,
//    port:,
//    jid:
//  };
//  this.client = new windowXMPP.Client();
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
