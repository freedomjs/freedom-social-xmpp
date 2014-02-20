/*globals freedom:true,setTimeout,console,VCardStore */
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
var XMPPSocialProvider = function(dispatchEvent) {
  this.dispatchEvent = dispatchEvent;
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
  if (loginOpts) {
    this.loginOpts = loginOpts;
  }

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
    this.view.open('XMPPLogin', {file: 'login.html'}).then(this.view.show.bind(this.view));
    return;
  }

  if (!this.client) {
    this.initializeState();
  }
  this.connect(continuation);
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
    this.login(null, continuation);
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

/**
 * Create an XMPP.Client, and begin connection to the server.
 * Uses settings from most recent 'login()' call, and from
 * credentials retrieved from the view.
 * @method connect
 * @private
 * @param {Function} continuation Callback upon connection
 */
XMPPSocialProvider.prototype.connect = function(continuation) {
  this.status = 'connecting';
  var key, connectOpts = {
    xmlns: 'jabber:client',
    jid: this.id,
    disallowTLS: true,
    preferred: 'PLAIN' //TODO: why doesn't DIGEST-MD5 work?
  };
  for (key in this.credentials) {
    if (this.credentials.hasOwnProperty(key)) {
      connectOpts[key] = this.credentials[key];
    }
  }

  try {
    console.warn(JSON.stringify(connectOpts));
    this.client = new window.XMPP.Client(connectOpts);
  } catch(e) {
    console.error(e.stack);
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
  var roster = this.vCardStore.getCards(), client;

  if (roster[this.credentials.userId]) {
    for (client in this.profile.clients) {
      if (this.profile.clients.hasOwnProperty(client)) {
        roster[this.credentials.userId].clients[client] = this.profile.clients[client];
      }
    }
  } else {
    roster[this.credentials.userId] = this.profile;
  }

  continuation(roster);
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

/**
 * Handle messages from the XMPP client.
 * @method onMessage
 * @private
 */
XMPPSocialProvider.prototype.onMessage = function(msg) {
  // Is it a message?
  if (msg.is('message') && msg.getChildText('body') && msg.attrs.type !== 'error') {
    this.sawClient(msg.attrs.from);
    
    if (msg.attrs.to.indexOf(this.loginOpts.agent) !== -1) {
      this.receiveMessage(msg.attrs.from, msg.getChildText('body'));
    } else {
      // TODO: relay chat messages from other clients in some way.
      console.warn('Ignoring Chat Message: ' + JSON.stringify(msg.attrs));
    }
  // Is it a status request?
  } else if (msg.is('iq') && msg.attrs.type === 'get') {
    if (msg.getChild('query') && msg.getChild('query').attrs.xmlns ===
        'http://jabber.org/protocol/disco#info') {
      this.sawClient(msg.attrs.from);

      this.sendCapabilities(msg.attrs.from, msg);      
    }
  // Is it a staus response?
  } else if (msg.is('iq') && msg.attrs.type === 'result') {
    this.updateRoster(msg);
  // Is it a status?
  } else if (msg.is('presence')) {
    this.onPresence(msg);
  // Is it something we don't understand?
  } else {
    console.warn('Dropped unknown XMPP message');
  }
};

/**
 * Receive a textual message from XMPP and relay it to
 * the parent module.
 * @method receiveMessage
 * @private
 * @param {String} from The Client ID of the message origin
 * @param {String} msg The received message.
 */
XMPPSocialProvider.prototype.receiveMessage = function(from, msg) {
  this.dispatchEvent('onMessage', {
    fromClientId: from,
    fromUserId: window.XMPP.JID(from).bare().toString(),
    network: this.loginOpts ? this.loginOpts.network : null,
    userId: this.credentials ? this.credentials.userId : null,
    toClientId: this.id,
    message: msg
  });
};

/**
 * Reply to a capability inquiry with client abilities.
 * @method sendCapabilities
 * @private
 * @param {String} to The client requesting capabilities
 * @param {XMPP.Stanza} msg The request message
 */
XMPPSocialProvider.prototype.sendCapabilities = function(to, msg) {
  var query = msg.getChild('query');
  
  msg.attrs.to = msg.attrs.from;
  delete msg.attrs.from;
  msg.attrs.type = 'result';

  query.c('identity', {
    category: 'client',
    name: this.loginOpts.agent,
    type: 'bot'
  }).up()
  .c('feature', {'var': 'http://jabber.org/protocol/caps'}).up()
  .c('feature', {'var': 'http://jabber.org/protocol/disco#info'}).up()
  .c('feature', {'var': this.loginOpts.url}).up();
  this.client.send(msg);
};

/**
 * Receive an XMPP Presence change message from another user.
 * @method onPresence
 * @private
 * @param {XMPP.Stanza} msg The incoming message
 */
XMPPSocialProvider.prototype.onPresence = function(msg) {
  var status = msg.getChildText('show') || 'online',
      user = msg.attrs.from,
      hash;
  if (msg.attrs.type === 'unavailable') {
    status = 'unavailable';
  }

  if (msg.getChild('x') && msg.getChild('x').getChildText('photo')) {
    hash = msg.getChild('x').getChildText('photo');
  }
  
  if (status === 'unavailable') {
    this.vCardStore.updatePropety(user, 'status', 'offline');
  } else {
    if (msg.getChild('c') && msg.getChild('c').attrs.node === this.loginOpts.url) {
      this.vCardStore.updateProperty(user, 'status', 'messageable');
    } else {
      this.vcardStore.updateProperty(user, 'status', 'online');
    }
  }
  
  this.vCardStore.updateProperty(user, 'xmppStatus', status);

  this.vCardStore.refreshCard(user, hash);
};

XMPPSocialProvider.prototype.updateRoster = function(msg) {
  var from = msg.attrs.from || msg.attrs.to,
      query = msg.getChild('query'),
      vCard = msg.getChild('vCard'),
      items, i;

  // Response to Query
  if (query && query.attrs.xmlns === 'jabber:iq:roster') {
    items = query.getChildren('item');
    for (i = 0; i < items.length; i += 1) {
      if(items[i].attrs.jid && items[i].attrs.name) {
        this.vCardStore.updateProperty(items[i].attrs.jid, 'name',
            items[i].attrs.name);
      }
    }
  }

  // Response to photo
  if (vCard && vCard.attrs.xmlns === 'vcard-temp') {
    this.vCardStore.updateVcard(vCard);
  }
};

XMPPSocialProvider.prototype.sawClient = function(client) {
  this.vCardStore.updatePropety(client, 'date', new Date());
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
  this.profile.clients[this.id].status = 'messageable';
  this.vCardStore.refreshCard(this.id, null);
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

/**
 * Update the parent freedom module with current status.
 * @method updateStatus
 * @private
 * @param {String} msg Current Provider Status
 *     Expected to be a key in social.STATUS_NETWORK
 */
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

/**
 * respond to an Error in the XMPP Client.
 * Logs out, resets state, and reports to parent module.
 * @method onError
 * @private
 * @param {Error|String} err The error.
 */
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

// Register provider when in a module context.
if (typeof freedom !== 'undefined') {
  freedom.social().provideAsynchronous(XMPPSocialProvider);
}
