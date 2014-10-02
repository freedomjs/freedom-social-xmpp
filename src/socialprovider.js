/*globals freedom:true,setTimeout,console,VCardStore,global */
/*jslint indent:2,white:true,sloppy:true */

/**
 * Implementation of a Social provider for freedom.js that
 * uses sockets to make xmpp connections to chat networks.
 **/


// Global declarations for node.js
if (typeof global !== 'undefined') {
  if (typeof window === 'undefined') {
    global.window = {};
  }
  if (typeof XMLHttpRequest === 'undefined') {
    global.XMLHttpRequest = {};
  }
} else {
  if (typeof window === 'undefined') {
    window = {};
  }
  if (typeof XMLHttpRequest === 'undefined') {
    XMLHttpRequest = {};
  }
}

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
  this.STATUS = social.STATUS;
  this.ERRCODE = social.ERRCODE;

  this.client = null;
  this.credentials = null;
  this.id = null;
  this.loginOpts = null;

  // Metadata about the roster
  this.vCardStore = new VCardStore();
  this.vCardStore.loadCard = this.requestUserStatus.bind(this);
  this.vCardStore.onUserChange = this.onUserChange.bind(this);
  this.vCardStore.onClientChange = this.onClientChange.bind(this);
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
    this.login(null, continuation);
  } else if (msg.cmd && msg.cmd === 'error') {
    continuation(undefined, this.ERRCODE.LOGIN_FAILEDCONNECTION);
  } else {
    continuation(undefined, this.ERRCODE.LOGIN_BADCREDENTIALS);
  }
};

/**
 * Initialize roster state on initial connection to the network
 * @method initializeState
 * @private
 */
XMPPSocialProvider.prototype.initializeState = function() {
  this.id = this.credentials.userId + '/' + this.loginOpts.agent;
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
  var key, connectOpts = {
    xmlns: 'jabber:client',
    jid: this.id,
    disallowTLS: false,
    preferred: 'PLAIN', //TODO: why doesn't DIGEST-MD5 work?
    reconnect: true,  // Automatically try reconnecting if disconnected.
    serialized: false  // Less messy writes.
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
    continuation(undefined, {
      errcode: this.ERRCODE.LOGIN_FAILEDCONNECTION.errcode,
      message: e.message
    });
    return;
  }
  this.client.addListener('online', this.onOnline.bind(this, continuation));
  this.client.addListener('error', function(e) {
    console.error('client.error: ', e);
    continuation(undefined, {
      errcode: this.ERRCODE.LOGIN_FAILEDCONNECTION.errcode,
      message: e.message
    });


    if (this.client) {
      this.client.end();
      delete this.client;
    }
  }.bind(this));
  this.client.addListener('offline', function(e) {
    // TODO: tell users of the API that this client is now offline,
    // either by emitting an onClientState with OFFLINE using:
    //   this.vCardStore.updateProperty(this.id, 'status', 'OFFLINE');
    // or emit a new type of event, or invoke this.logout directly to
    // clean things up.
    console.error('received unhandled offline event', e);
  });
  this.client.addListener('close', function(e) {
    // This may indicate a broken connection to XMPP.
    // TODO: handle this.
    console.error('received unhandled close event', e);
  });
  this.client.addListener('end', function(e) {
    // TODO: figure out when this is fired and handle this.
    console.error('received unhandled end event', e);
  });
  this.client.addListener('stanza', this.onMessage.bind(this));
};

/**
 * Clear any credentials / state in the app.
 * @method clearCachedCredentials
 */
XMPPSocialProvider.prototype.clearCachedCredentials  = function(continuation) {
  delete this.credentials;
  continuation();
};

/**
 * Returns all the <client_state>s that we've seen so far (from any 'onClientState' event)
 * Note: this instance's own <client_state> will be somewhere in this list
 * Use the clientId returned from social.login() to extract your element
 * 
 * @method getClients
 * @return {Object} { 
 *    'clientId1': <client_state>,
 *    'clientId2': <client_state>,
 *     ...
 * } List of <client_state>s indexed by clientId
 *   On failure, rejects with an error code (see above)
 */
XMPPSocialProvider.prototype.getClients = function(continuation) {
  continuation(this.vCardStore.getClients());
};

XMPPSocialProvider.prototype.getUsers = function(continuation) {
  continuation(this.vCardStore.getUsers());
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
    continuation(undefined, this.ERRCODE.OFFLINE);
    return;
  }

  // If the destination client is ONLINE (i.e. using the same type of client)
  // send this message with type 'normal' so it only reaches that client,
  // otherwise use type 'chat' to send to all clients.
  // Sending all messages as type 'normal' means we can't communicate across
  // different client types, but sending all as type 'chat' means messages
  // will be broadcast to all clients.
  var messageType = (this.vCardStore.getClient(to).status === 'ONLINE') ?
      'normal' : 'chat';
  
  try {
    this.client.send(new window.XMPP.Element('message', {
      to: to,
      type: messageType
    }).c('body').t(msg));
  } catch(e) {
    console.error(e.stack);
    continuation(undefined, {
      errcode: this.ERRCODE.UNKNOWN,
      message: e.message
    });
    return;
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
    // TODO: check the agent matches our resource Id so we don't pick up chats not directed
    // at this client.
    this.receiveMessage(msg.attrs.from, msg.getChildText('body'));
    /*
    if (msg.attrs.to.indexOf(this.loginOpts.agent) !== -1) {
      this.receiveMessage(msg.attrs.from, msg.getChildText('body'));
    } else {
      // TODO: relay chat messages from other clients in some way.
      console.warn('Ignoring Chat Message: ' + JSON.stringify(msg.attrs));
    }
    */
  // Is it a status request?
  } else if (msg.is('iq') && msg.attrs.type === 'get') {
    if (msg.getChild('query') && msg.getChild('query').attrs.xmlns ===
        'http://jabber.org/protocol/disco#info') {
      this.sawClient(msg.attrs.from);

      this.sendCapabilities(msg.attrs.from, msg);      
    }
  // Is it a staus response?
  } else if (msg.is('iq') && (msg.attrs.type === 'result' ||
      msg.attrs.type === 'set')) {
    this.updateRoster(msg);
  // Is it a status?
  } else if (msg.is('presence')) {
    this.onPresence(msg);
  // Is it something we don't understand?
  } else {
    console.warn('Dropped unknown XMPP message');
    console.warn(msg);
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
    from: this.vCardStore.getClient(from),
    to: this.vCardStore.getClient(this.id),
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
    this.vCardStore.updateProperty(user, 'status', 'OFFLINE');
  } else {
    if (msg.getChild('c') && msg.getChild('c').attrs.node === this.loginOpts.url) {
      this.vCardStore.updateProperty(user, 'status', 'ONLINE');
    } else {
      this.vCardStore.updateProperty(user, 'status', 'ONLINE_WITH_OTHER_APP');
    }
  }
  
  this.vCardStore.updateProperty(user, 'xmppStatus', status);

  this.vCardStore.refreshContact(user, hash);
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
        this.vCardStore.updateUser(items[i].attrs.jid, 'name',
            items[i].attrs.name);
        this.vCardStore.refreshContact(items[i].attrs.jid);
      }
    }
  }

  // Response to photo
  if (vCard && vCard.attrs.xmlns === 'vcard-temp') {
    this.vCardStore.updateVcard(from, vCard);
  }
};

XMPPSocialProvider.prototype.sawClient = function(client) {
  this.vCardStore.updateProperty(client, 'timestamp', new Date());
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

  this.status = 'ONLINE';  
  // Get roster.
  this.client.send(new window.XMPP.Element('iq', {type: 'get'})
      .c('query', {
        xmlns: 'jabber:iq:roster'
      }).up());
  
  // Update status.
  this.vCardStore.updateProperty(this.id, 'status', 'ONLINE');
  this.vCardStore.refreshContact(this.id, null);
  
  continuation(this.vCardStore.getClient(this.id));
};

XMPPSocialProvider.prototype.logout = function(continuation) {
  var userId = this.credentials? this.credentials.userId : null;

  this.status = 'offline';
  this.credentials = null;
  if (this.client) {
    this.client.send(new window.XMPP.Element('presence', {
      type: 'unavailable'
    }));
    this.client.end();
    this.client = null;
  }
  if (this.view) {
    this.view.postMessage('logout');
  }
  continuation();
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

XMPPSocialProvider.prototype.onUserChange = function(card) {
  this.dispatchEvent('onUserProfile', card);
};

XMPPSocialProvider.prototype.onClientChange = function(card) {
  this.dispatchEvent('onClientState', card);
};

// Register provider when in a module context.
if (typeof freedom !== 'undefined') {
  freedom.social().provideAsynchronous(XMPPSocialProvider);
}
