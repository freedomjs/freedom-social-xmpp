/*globals freedom:true,setTimeout,console */
/*jslint indent:2,white:true,sloppy:true */

/**
 * Implementation of a Social provider for freedom.js that
 * uses sockets to make xmpp connections to chat networks.
 **/

var window = {};
var socket = freedom['core.socket']();

/**
 * The SocialProvider implements the freedom.js social API
 * It wraps an XMPP Client, and handles freedom-specific
 * interactions like authentication.
 * @class XMPPSocialProvider
 * @constructor
 */
var XMPPSocialProvider = function() {
  var social = freedom.social();
  this.STATUS_NETWORK = social.STATUS_NETWORK;
  this.STATUS_CLIENT = social.STATUS_CLIENT;

  this.client = null;
  this.credentials = null;
  this.id = null;
  this.loginOpts = null;

  // Metadata about the roster
  this.vCardStore = new VCardStore();
  this.vCardStore.loadCard = this.requestUserStatus.bind(this);
  this.vCardStore.onChange = this.onRosterChange.bind(this);
  this.profile = {};

  this.status = 'offline';
  setTimeout(this.updateStatus.bind(this, 'Initializing'), 0);
  
};

/**
 * Begin the login view, potentially prompting for credentials.
 * @method login
 * @param {Object} loginOpts Setup information about the desired network.
 *   keys used by this provider include
 *   agent - The user agent to expose on the network
 *   url - The url of the client connecting
 *   version - The version of the client.
 *   network - A string used to differentiate this provider in events.
 */
XMPPSocialProvider.prototype.login = function(loginOpts, continuation) {
  this.loginOpts = loginOpts;

  if (!this.credentials) {
    if (!this.view) {
      this.view = freedom['core.view']();
    } else {
      this.view.close();
      this.view = freedom['core.view']();
    }

    this.status = 'authenticating';
    this.updateStatus('Retreiving Credentials');
    this.view.once('message', this.onCredentials.bind(this, continuation));
    this.view.open('XMPPLogin', {file: 'login.html'}).done(this.view.show.bind(this.view));
    return;
  }

  if (!this.client) {
    this.initializeState();
  }
  this.connect();
};

/**
 * Get credentials back from the view.
 * @method onCredentials
 * @private
 * @param {function} continuation call to complete the login promise.
 * @param {Object} msg The message sent from the authentication view.
 */
XMPPSocialProvider.prototype.onCredentials = function(continuation, msg) {
  if (msg.cmd && msg.cmd === 'auth') {
    this.credentials = msg.message;
    this.view.close();
    delete this.view;
  } else if (msg.cmd && msg.cmd === 'error') {
    continuation(this.onError(msg.message));
  } else {
    continuation(this.onError('Unrecognized Authentication: ' + JSON.stringify(msg)));
  }
};

/**
 * Initialize roster state on initial connection to the network
 * @method initializeState
 * @private
 */
XMPPSocialProvider.prototype.initializeState = function() {
  this.id = this.credentials.userId + '/' + this.loginOpts.agent;
  this.updateStatus('Initializing Connection');
  this.profile = {
    userId: this.credentials.userId,
    clients: {}
  };
  this.profile.clients[this.id] = {
    clientId: this.id,
    network: this.loginOpts.network,
    status: 'offline'
  };
};

XMPPSocialProvider.prototype.connect = function(continuation) {
  this.status = 'connecting';
  var key, connectOpts = {
    xmlns: 'jabber:client',
    jid: this.id,
    disallowTLS: true
  };
  for (key in this.credentials) {
    if (this.credentials.hasOwnProperty(key)) {
      connectOpts[key] = this.credentials[key];
    }
  }

  try {
    this.client = new window.XMPP.Client(connectOpts);
  } catch(e) {
    continuation(this.onError('XMPP Connection Error: ' + e));
    return;
  }
  this.client.addListener('online', this.onOnline.bind(this, continuation));
  this.client.addListener('error', function(e) {
    continuation(this.onError('XMPP Connection Error: ' + e));
  }.bind(this));
  this.client.addListener('stanza', this.onMessage.bind(this));
};

/**
 * Returns all user cards seen so far and provided by 'onChange' events.
 * The user's own card will be in this list.
 * @method getRoster
 * @return {Object} { List of [user cards] indexed by userId
 *    'userId1': [user card],
 *    'userId2': [user card],
 *    ...
 * }
 */
XMPPSocialProvider.prototype.getRoster = function(continuation) {
  continuation(this.roster);
};

/**
 * Sends a message to a user on the network.
 * If the destination is not specified or invalid, the mssage is dropped.
 * @method sendMessage
 * @param {String} to clientId of the device or user to send to.
 * @param {String} msg The message to send
 * @param {Function} continuation Callback after message is sent.
 */
XMPPSocialProvider.prototype.sendMessage = function(to, msg, continuation) {
  if (!this.client) {
    console.warn('No client available to send message to ' + to);
    continuation();
    return;
  }
  
  try {
    this.client.send(new window.XMPP.Element('message', {
      to: to,
      type: 'normal'
    }).c('body').t(msg));
  } catch(e) {
    console.error(e.stack);
  }
  continuation();
};

XMPPSocialProvider.prototype.onMessage = function(msg) {
};

XMPPSocialProvider.prototype.onOnline = function(continuation) {
  // Announce.
  this.client.send(new window.XMPP.Element('presence', {})
      .c('show').t('xa').up() // Mark status 'extended away'
      .c('c', { // Advertise capabilities
        xmlns: 'http://jabber.org/protocol/caps',
        node: this.loginOpts.url,
        ver: this.loginOpts.version,
        hash: 'fixed'
      }).up());

  this.status = 'online';
  this.updateStatus('Online');
  
  // Get roster.
  this.client.send(new window.XMPP.Element('iq', {type: 'get'})
      .c('query', {
        xmlns: 'jabber:iq:roster'
      }).up());
  
  // Update status.
};

XMPPSocialProvider.prototype.logout = function(logoutOpts, continuation) {
  var userId = this.credentials? this.credentials.userId : null;

  this.status = 'offline';
  if (this.profile) {
    this.profile.clients = {};
  }
  this.credentials = null;
  if (this.client) {
    this.client.send(new window.XMPP.Element('presence', {
      type: 'unavailable'
    }));
    this.client.end();
    this.client = null;
  }
  continuation(this.updateStatus('Offline'));
};

XMPPSocialProvider.prototype.requestUserStatus = function(user) {
  if (!this.client) {
    console.warn('User status request to ' + user + ' dropped, no client available.');
    return;
  }
  this.client.send(new window.XMPP.Element('iq', {
    type: 'get',
    to: user
  }).c('vCard', {'xmlns': 'vcard-temp'}).up());
};

XMPPSocialProvider.prototype.onRosterChange = function(user, card) {
  this.dispatchEvent('onChange', card);
};

XMPPSocialProvider.prototype.updateStatus = function(msg) {
  var message = {
    network: this.loginOpts ? this.loginOpts.network : null,
    userId: this.credentials ? this.credentials.userId : null,
    clientId: this.id,
    status: this.STATUS_NETWORK[this.status],
    message: msg
  };
  this.dispatchEvent('onStatus', message);
  return message;
};

XMPPSocialProvider.prototype.onError = function(err) {
  this.status = 'error';
  var ret = {
    id: this.credentials ? this.credentials.userId : null,
    network: this.loginOpts ? this.loginOpts.network : null,
    status: this.status,
    message: err
  };
  if (this.client) {
    this.client.end();
    delete this.client;
  }
  this.updateStatus('Error: ' + err);
  this.credentials = null;
  return ret;
};

if (typeof freedom !== 'undefined') {
  freedom.social().provideAsynchronous(XMPPSocialProvider);
}
