/*jslint white:true,sloppy:true */
/*global window:true,freedom:true,setTimeout,console,VCardStore,global */

/**
 * Implementation of a Social provider for freedom.js that
 * uses sockets to make xmpp connections to chat networks.
 **/

// Global declarations for node.js
if (typeof global !== 'undefined') {
  if (typeof window === 'undefined') {
    global.window = {};
  }
} else {
  if (typeof window === 'undefined') {
    var window = {};
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
  var social = freedom.social ? freedom.social() : freedom();
  this.STATUS = social.STATUS;
  this.ERRCODE = social.ERRCODE;

  this.client = null;
  this.credentials = null;
  this.id = null;
  this.loginOpts = null;
  this.lastMessageTimestampMs_ = null;
  this.pollForDisconnectInterval_ = null;
  this.MAX_MS_WITHOUT_COMMUNICATION_ = 60000;
  this.MAX_MS_PING_REPSONSE_ = 5000;

  // Metadata about the roster
  this.vCardStore = new VCardStore();
  this.vCardStore.loadCard = this.requestUserStatus.bind(this);
  this.vCardStore.onUserChange = this.onUserChange.bind(this);
  this.vCardStore.onClientChange = this.onClientChange.bind(this);

  // Used to batch messages sent through social provider (for
  // rate limiting).
  this.sendMessagesTimeout = null;
  this.timeOfFirstMessageInBatch = 0;
  // buffered outbound messages. Arrays of of {message, callback} keyed by
  // recipient.
  this.messages = {};

  // Logger
  this.logger = function() {};
  if (typeof freedom !== 'undefined' &&
      typeof freedom.core === 'function') {
    freedom.core().getLogger('[XMPPSocialProvider]').then(function(log) {
      this.logger = log;
    }.bind(this));
  } else if (typeof console !== 'undefined') {
    this.logger = console;
  }
};

/**
 * Begin the login view, potentially prompting for credentials.
 * This is expected to be overridden by a *-auth.js file
 * @override
 * @method login
 * @param {Object} loginOpts Setup information about the desired network.
 */
XMPPSocialProvider.prototype.login = function(loginOpts, continuation) {
  continuation(undefined, {
    errcode: 'UNKNOWN',
    message: 'No login function defined'
    //message: this.ERRCODE.LOGIN_OAUTHERROR
  });
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
    this.login(null, continuation);
  } else if (msg.cmd && msg.cmd === 'error') {
    continuation(undefined, {
      errcode: 'LOGIN_FAILEDCONNECTION',
      message: this.ERRCODE.LOGIN_FAILEDCONNECTION
    });
  } else {
    continuation(undefined, {
      errcode: 'LOGIN_BADCREDENTIALS',
      message: this.ERRCODE.LOGIN_BADCREDENTIALS
    });
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
  if (this.client) {
    // Store our new credentials since logging out the old client
    // will clear this.credentials.
    var newCredentials = this.credentials;
    this.logout();
    this.credentials = newCredentials;
  }

  var key, jid, connectOpts = {
    xmlns: 'jabber:client',
    jid: this.id,
    disallowTLS: false,
    preferred: 'PLAIN', //TODO: why doesn't DIGEST-MD5 work?
    reconnect: false,  // Automatically try reconnecting if disconnected.
    serialized: false  // Less messy writes.
  };
  for (key in this.credentials) {
    if (this.credentials.hasOwnProperty(key)) {
      connectOpts[key] = this.credentials[key];
    }
  }

  if (connectOpts.host === 'talk.google.com') {
    // Use JID with domain of 'google.com', to fix cert errors.  If we don't
    // do this, we will get the cert for gmail.com, which will result in an
    // error on Chrome because it will not match the google.com domain
    // we connect to.
    jid = new window.XMPP.JID(this.id);
    jid.setDomain('google.com');
    connectOpts.jid = jid;
  }

  try {
    this.client = new window.XMPP.Client(connectOpts);
  } catch(e) {
    this.logger.error(e.stack);
    continuation(undefined, {
      errcode: 'LOGIN_FAILEDCONNECTION',
      message: e.message
    });
    return;
  }
  this.client.addListener('online', this.onOnline.bind(this, continuation));
  this.client.addListener('error', function(e) {
    this.logger.error('client.error: ', e);
    continuation(undefined, {
      errcode: 'LOGIN_FAILEDCONNECTION',
      message: e.message
    });


    if (this.client) {
      this.logout();
    }
  }.bind(this));
  this.client.addListener('offline', function(e) {
    // TODO: tell users of the API that this client is now offline,
    // either by emitting an onClientState with OFFLINE using:
    //   this.vCardStore.updateProperty(this.id, 'status', 'OFFLINE');
    // or emit a new type of event, or invoke this.logout directly to
    // clean things up.
    this.vCardStore.updateProperty(this.id, 'status', 'OFFLINE');
  }.bind(this));
  this.client.addListener('close', function(e) {
    this.logger.error('received close event', e);
    if (this.status === 'ONLINE') {
      // Check if we are still online, otherwise log out.
      this.ping_();
    }
  }.bind(this));
  this.client.addListener('end', function(e) {
    if (this.status !== 'ONLINE' && this.client) {
      // Login is still pending, reject the login promise.
      this.logger.error('Received end event while logging in');
      continuation(undefined, {
        errcode: 'LOGIN_FAILEDCONNECTION',
        message: 'Received end event'
      });
    } else if (this.client) {
      // Got an 'end' event without logout having been called, call logout.
      this.logger.error('Received unexpected end event');
      this.logout();
    }
  }.bind(this));
  this.client.addListener('stanza', this.onMessage.bind(this));
};

/**
 * Clear any credentials / state in the app.
 * @method clearCachedCredentials
 */
XMPPSocialProvider.prototype.clearCachedCredentials = function(continuation) {
  this.credentials = null;
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
    this.logger.warn('No client available to send message to ' + to);
    continuation(undefined, {
      errcode: 'OFFLINE',
      message: this.ERRCODE.OFFLINE
    });
    return;
  }

  // After each message is received, reset the timeout to
  // wait for at least 100ms to batch other messages received
  // in that window. However, if the oldest message in the batch
  // was received over 2s ago, don't reset the timeout, and
  // just allow the current timeout to execute.
  if (!this.messages[to]) {
    this.messages[to] = [];
  }
  this.messages[to].push({
    message: msg,
    continuation: continuation
  });
  if (!this.sendMessagesTimeout) {
    this.timeOfFirstMessageInBatch = Date.now();
  }
  if ((Date.now() - this.timeOfFirstMessageInBatch < 2000) ||
      !this.sendMessagesTimeout) {
    clearTimeout(this.sendMessagesTimeout);
    this.sendMessagesTimeout = setTimeout(function () {
      Object.keys(this.messages).forEach(function (to) {
        // If the destination client is ONLINE (i.e. using the same type of
        // client) send this message with type 'normal' so it only reaches
        // that client - and use JSON encoding, which this class on the other
        // side will parse. otherwise use type 'chat' to send to all clients -
        // in this later case, messages are sent directly, since the goal is to
        // be human readable. Sending all messages as type 'normal' means we
        // can't communicate across different client types, but sending all as
        // type 'chat' means messages will be broadcast to all clients.
        var i = 0,
          status = this.vCardStore.getClient(to).status,
          messageType = status === 'ONLINE_WITH_OTHER_APP' ? 'chat' : 'normal',
          stanza = new window.XMPP.Element('message', {
            to: to,
            type: messageType
          }),
          message = stanza.c('body'),
          body;

        if (status === 'ONLINE') {
          body = [];
          for (i = 0; i < this.messages[to].length; i += 1) {
            body.push(this.messages[to][i].message);
          }
          message.t(JSON.stringify(body));
        } else {
          body = '';
          for (i = 0; i < this.messages[to].length; i += 1) {
            if (i > 0) {
              body += '\n';
            }
            body += this.messages[to][i].message;
          }
          message.t(body);
        }

        stanza.c('nos:skiparchive', {
          value: 'true',
          'xmlns:nos' : 'google:nosave'
        });

        try {
          this.client.send(message);
          for (i = 0; i < this.messages[to].length; i += 1) {
            this.messages[to][i].continuation();
          }
        } catch(e) {
          for (i = 0; i < this.messages[to].length; i += 1) {
            this.messages[to][i].continuation(null, {
              errcode: 'UNKNOWN',
              message: 'Send Failed: ' + e.message
            });
          }
        }
      }.bind(this));

      this.messages = {};
      this.sendMessagesTimeout = null;
    }.bind(this), 100);
  }
};

/**
 * Handle messages from the XMPP client.
 * @method onMessage
 * @private
 */
XMPPSocialProvider.prototype.onMessage = function(msg) {
  this.lastMessageTimestampMs_ = Date.now();
  // Is it a message?
  if (msg.is('message') && msg.getChildText('body') && msg.attrs.type !== 'error') {
    if (!this.vCardStore.hasClient(msg.attrs.from)) {
      // If we don't already have a client for the message sender, create a
      // client with ONLINE_WITH_OTHER_APP.  If we don't do this, we may emit
      // onClientState events without any status field.
      // See https://github.com/uProxy/uproxy/issues/892 for more info.
      // TODO: periodically re-sync the roster so we don't keep this client
      // ONLINE_WITH_OTHER_APP forever.
      // https://github.com/freedomjs/freedom-social-xmpp/issues/107
      this.vCardStore.updateProperty(
          msg.attrs.from, 'status', 'ONLINE_WITH_OTHER_APP');
    }
    this.sawClient(msg.attrs.from);
    // TODO: check the agent matches our resource Id so we don't pick up chats not directed
    // at this client.
    this.receiveMessage(msg.attrs.from, msg.getChildText('body'));
    /*
    if (msg.attrs.to.indexOf(this.loginOpts.agent) !== -1) {
      this.receiveMessage(msg.attrs.from, msg.getChildText('body'));
    } else {
      // TODO: relay chat messages from other clients in some way.
      this.logger.warn('Ignoring Chat Message: ' + JSON.stringify(msg.attrs));
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
    this.logger.warn('Dropped unknown XMPP message');
    this.logger.warn(msg.toString());
  }
};

/**
 * Receive a textual message from XMPP and relay it to
 * the parent module.
 * @method receiveMessage
 * @private
 * @param {String} from The Client ID of the message origin
 * @param {String} msgs A batch of messages.
 */
XMPPSocialProvider.prototype.receiveMessage = function(from, msgs) {
  var parsedMessages;
  try {
    // Split msgs into an array only if it is a JSON formatted array.
    parsedMessages = JSON.parse(msgs);
    if (!XMPPSocialProvider.isArray(parsedMessages)) {
      parsedMessages = [msgs];
    }
  } catch(e) {
    // msgs is not valid JSON, just emit one onMessage with that string.
    parsedMessages = [msgs];
  }
  for (var i = 0; i < parsedMessages.length; i+=1) {
    this.dispatchEvent('onMessage', {
      from: this.vCardStore.getClient(from),
      to: this.vCardStore.getClient(this.id),
      message: parsedMessages[i]
    });
  }
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
      this.vCardStore.refreshContact(user, hash);
    } else {
      this.vCardStore.updateProperty(user, 'status', 'ONLINE_WITH_OTHER_APP');
    }
  }

  this.vCardStore.updateProperty(user, 'xmppStatus', status);
};

XMPPSocialProvider.prototype.updateRoster = function(msg) {
  var from = msg.attrs.from || msg.attrs.to,
      query = msg.getChild('query'),
      vCard = msg.getChild('vCard'),
      items, i;

  // Response to roster query
  if (query && query.attrs.xmlns === 'jabber:iq:roster') {
    items = query.getChildren('item');
    for (i = 0; i < items.length; i += 1) {
      if(items[i].attrs.jid && items[i].attrs.name) {
        this.vCardStore.updateUser(items[i].attrs.jid, 'name',
            items[i].attrs.name);
        //this.vCardStore.refreshContact(items[i].attrs.jid);
      }
    }
  }

  // Response to photo
  if (vCard && vCard.attrs.xmlns === 'vcard-temp') {
    this.vCardStore.updateVcard(from, vCard);
  }
};

XMPPSocialProvider.prototype.sawClient = function(client) {
  this.vCardStore.updateProperty(client, 'lastSeen', new Date());
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

  this.startPollingForDisconnect_();

  continuation(this.vCardStore.getClient(this.id));
};

XMPPSocialProvider.prototype.ping_ = function() {
  var pingTimestampMs = Date.now();
  var ping = new window.XMPP.Element('iq', {type: 'get'})
      .c('ping', {'xmlns': 'urn:xmpp:ping'}).up();
  this.client.send(ping);

  // Check that we got a response from the server after the ping was sent.
  setTimeout(function() {
    if (this.client &&  // check this.client to be sure logout wasn't called.
        (!this.lastMessageTimestampMs_ ||
         this.lastMessageTimestampMs_ < pingTimestampMs)) {
      // No response to ping, we are disconnected.
      this.logger.warn('No ping response from server, logging out');
      this.logout();
    }
  }.bind(this), this.MAX_MS_PING_REPSONSE_);
};

XMPPSocialProvider.prototype.startPollingForDisconnect_ = function() {
  if (this.pollForDisconnectInterval_) {
    this.logger.error('startPollingForDisconnect_ called while already polling');
    return;
  }

  var lastAwakeTimestampMs = Date.now();
  this.pollForDisconnectInterval_ = setInterval(function() {
    // Check if the computer had gone to sleep
    var nowTimestampMs = Date.now();
    if (nowTimestampMs - lastAwakeTimestampMs > 2000) {
      // Timeout expected to run every 1000 ms didn't run for over 2000 ms,
      // probably because the computer went to sleep.  Send a ping to check
      // that we are still connected to the XMPP server.
      this.logger.log('Detected sleep for ' +
          (nowTimestampMs - lastAwakeTimestampMs) + 'ms');
      this.ping_();
    }
    lastAwakeTimestampMs = nowTimestampMs;

    // Check that we are still receiving data from the XMPP server, about
    // once per minute (randomized).
    var seconds = Math.floor((nowTimestampMs / 1000) % 60);
    if (seconds === Math.floor(Math.random() * 60) &&
        (!this.lastMessageTimestampMs_ ||
         nowTimestampMs - this.lastMessageTimestampMs_ >
         this.MAX_MS_WITHOUT_COMMUNICATION_)) {
      this.ping_();
    }
  }.bind(this), 1000);
};

XMPPSocialProvider.prototype.logout = function(continuation) {
  this.status = 'offline';
  this.lastMessageTimestampMs_ = null;
  if (this.pollForDisconnectInterval_) {
    clearInterval(this.pollForDisconnectInterval_);
    this.pollForDisconnectInterval_ = null;
  }
  if (this.client) {
    this.client.send(new window.XMPP.Element('presence', {
      type: 'unavailable'
    }));
    this.client.end();
    // end() still relies on the client's event listeners
    // so they can only be removed after calling end().
    this.client.removeAllListeners('online');
    this.client.removeAllListeners('error');
    this.client.removeAllListeners('offline');
    this.client.removeAllListeners('close');
    this.client.removeAllListeners('end');
    this.client.removeAllListeners('stanza');
    this.client = null;
  }
  if (continuation) {
    continuation();
  }
};

XMPPSocialProvider.prototype.requestUserStatus = function(user) {
  if (!this.client) {
    this.logger.warn('User status request to ' + user + ' dropped, no client available.');
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

XMPPSocialProvider.isArray = function(a) {
  return Array.isArray ? Array.isArray(a) : (a instanceof Array);
};

// Register provider when in a module context.
if (typeof freedom !== 'undefined') {
  if (!freedom.social) {
    freedom().provideAsynchronous(XMPPSocialProvider);
  } else {
    freedom.social().provideAsynchronous(XMPPSocialProvider);
  }
}
