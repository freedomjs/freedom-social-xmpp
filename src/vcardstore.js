/*globals freedom:true,setTimeout,window,VCardStore:true */
/*jslint indent:2,white:true,sloppy:true */

VCardStore = function () {
  if (freedom && freedom['core.storage']) {
    this.storage = freedom['core.storage']();
  }
  this.clients = {};
  this.users = {};
  this.requestTime = {};
  this.requestQueue = [];
  this.fetchTime = new Date();
};

/**
 * Overridden method for requesting status from a user.
 */
VCardStore.prototype.loadCard = function(user) {};

/**
 * Overridden method for handling changes to user state.
 */
VCardStore.prototype.onUserChange = function(card) {};

/**
 * Overridden method for handling changes to client state.
 */
VCardStore.prototype.onClientChange = function(card) {};

// Time before a request is considered 'dead'.
VCardStore.prototype.REQUEST_TIMEOUT = 3000;

VCardStore.prototype.THROTTLE_TIMEOUT = 500;

VCardStore.prototype.getClient = function(user) {
  var userid = new window.XMPP.JID(user).bare().toString(), state = {
    userId: userid,
    clientId: user,
    status: 'OFFLINE',
    timestamp: 0
  };

  if (this.clients[user]) {
    state.status = this.clients[user].status;
    state.timestamp = this.clients[user].date;
  }
  
  return state;
};

VCardStore.prototype.getClients = function() {
  var client, cards = {};
  for (client in this.clients) {
    if (this.clients.hasOwnProperty(client)) {
      cards[client] = this.getClient(client); 
    }
  }
  return cards;
};

VCardStore.prototype.getUser = function(user) {
  var state = {
    userId: user
  };
  
  if (this.users[user]) {
    state.timestamp = this.users[user].timestamp;
    state.name = this.users[user].name;
    state.url = this.users[user].url;
    state.imageData = this.users[user].imageData;
  }

  return state;
};

VCardStore.prototype.getUsers = function() {
  var allUsers = {}, userId;
  for (userId in this.users) {
    if (this.users.hasOwnProperty(userId)) {
      allUsers[userId] = this.getUser(userId);
    }
  }
  return allUsers;
};

VCardStore.prototype.updateVcard = function(from, message) {
  var userid = new window.XMPP.JID(from).bare().toString(),
      user = this.users[userid] || {},
      name, url, photo,
      changed = false;
  if (message.attr('xmlns') !== 'vcard-temp' ||
     !this.storage) {
    return;
  }

  user.userId = userid;
  name = message.getChildText('FN');
  url = message.getChildText('URL');
  photo = message.getChild('PHOTO');

  if (name) {
    if (name !== user.name) {
      changed = true;
    }
    user.name = name;
  }
  if (url) {
    if (url !== user.url) {
      changed = true;
    }
    user.url = url;
  }
  if (photo && photo.getChildText('EXTVAL')) {
    if (user.imageData !== photo.getChildText('EXTVAL')) {
      changed = true;
    }
    user.imageData = photo.getChildText('EXTVAL');
  } else if (photo && photo.getChildText('TYPE') &&
            photo.getChildText('BINVAL')) {
    url = 'data:' +
      photo.getChildText('TYPE') + ';base64,' +
      photo.getChildText('BINVAL');
    if (user.imageData !== url) {
      changed = true;
    }
    user.imageData = url;
  }

  if (changed) {
    user.timestamp = Date.now();
    this.users[userid] = user;
    this.onUserChange(user);
  }

  this.storage.set('vcard-' + from, JSON.stringify(user));
};

/**
 * Update a property about a client.
 * @method updateProperty
 * @param {String} user The client identifier to update.
 * @param {Stirng} property The property to set
 * @param {Object} value The value to set.
 */
VCardStore.prototype.updateProperty = function(user, property, value) {
  var userid = new window.XMPP.JID(user).bare().toString();
  if (!this.clients[user]) {
    this.clients[user] = {
      userId: userid,
      clientId: user
    };
  }
  this.clients[user][property] = value;
  this.clients[user].timestamp = Date.now();
  this.onClientChange(this.clients[user]);
};

VCardStore.prototype.updateUser = function(user, property, value) {
  if (!this.users[user]) {
    this.users[user] = {
      userId: user
    };
  }
  this.users[user][property] = value;
  this.users[user].timestamp = Date.now();
};

VCardStore.prototype.refreshContact = function(user, hash) {
  if (!this.storage) {
    return false;
  }

  if (this.users[user] && (!hash || this.users[user].hash === hash)) {
    return this.users[user];
  }
  
  this.storage.get('vcard-' + user).then(function(result) {
    if (result === null || result === undefined) {
      this.fetchVcard(user);
    } else if (hash && hash !== result.hash) {
      this.fetchVcard(user);
    }
  }.bind(this));
};

VCardStore.prototype.fetchVcard = function(user) {
  var time = new Date();
  if (!this.requestTime[user] || (time - this.requestTime[user] >
                                  this.REQUEST_TIMEOUT)) {
    this.requestTime[user] = time;
    this.requestQueue.push(user);
    this.checkVCardQueue();
  }
};

VCardStore.prototype.checkVCardQueue = function() {
  var time = new Date(), next;
  if (this.requestQueue.length < 1) {
    return;
  } else if ((time - this.fetchTime) > this.THROTTLE_TIMEOUT) {
    next = this.requestQueue.shift();
    this.fetchTime = time;

    // Request loadCard from delegate.
    this.loadCard(next);
  } else {
    setTimeout(this.checkVCardQueue.bind(this), this.THROTTLE_TIMEOUT);
  }
};
