/*globals freedom:true,setTimeout,window,VCardStore:true */
/*jslint indent:2,white:true,sloppy:true */

VCardStore = function () {
  if (freedom && freedom['core.storage']) {
    this._storage = freedom['core.storage']();
  }
  this.clients = {};
  this.users = {};
  this._requestTime = {};
  this._requestQueue = [];
  this._fetchTime = new Date();

  this._init();
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

VCardStore.prototype.PREFIX = "vcard-";

VCardStore.prototype.hasClient = function(user) {
  return this.clients[user] ? true : false;
};

VCardStore.prototype.getClient = function(user) {
  var userid = new window.XMPP.JID(user).bare().toString(), state = {
    userId: userid,
    clientId: user,
    status: 'OFFLINE',
    lastSeen: 0,
    lastUpdated: 0
  };

  if (this.clients[user]) {
    state.status = this.clients[user].status;
    state.lastSeen = this.clients[user].lastSeen;
    state.lastUpdated = this.clients[user].lastUpdated;
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
    state.lastSeen = this.clients[user].lastSeen;
    state.lastUpdated = this.clients[user].lastUpdated;
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
  var userid = new window.XMPP.JID(from).bare().toString();

  if (message.attr('xmlns') !== 'vcard-temp' ||
     !this._storage) {
    return;
  }

  if (message.getChildText("FN")) {
    this.updateUser(userid, "name", message.getChildText("FN"));
  }
  if (message.getChildText("URL")) {
    this.updateUser(userid, "url", message.getChildText("URL"));
  }

  var photo = message.getChild('PHOTO');
  if (photo && photo.getChildText('EXTVAL')) {
    this.updateUser(userid, "imageData", photo.getChildText("EXTVAL"));
  } else if (photo && photo.getChildText('TYPE') &&
            photo.getChildText('BINVAL')) {
    this.updateUser(userid, "imageData", 'data:' +
      photo.getChildText('TYPE') + ';base64,' +
      photo.getChildText('BINVAL');
    );
  }
};

/**
 * Update a property about a client.
 * @method updateProperty
 * @param {String} user The client identifier to update.
 * @param {String} property The property to set
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
  this.clients[user].lastSeen = Date.now();
  this.clients[user].lastUpdated = Date.now();
  this.onClientChange(this.clients[user]);
};

VCardStore.prototype.updateUser = function(user, property, value) {
  if (!this.users[user]) {
    this.users[user] = {
      userId: user
    };
  }
  this.users[user][property] = value;
  this.users[user].lastSeen = Date.now();
  this.users[user].lastUpdated = Date.now();
  this.onUserChange(this.users[user]);
  if (this._storage) {
    this._storage.set(this.PREFIX + userid, JSON.stringify(this.users[user]));
  }
};

VCardStore.prototype.refreshContact = function(user, hash) {
  var userid = new window.XMPP.JID(user).bare().toString();
  var time = new Date();
  
  if (!this.users.hasOwnProperty(userid) ||
      (hash && this.users[userid].hash !== hash)) {
    if (!this._requestTime[user] || 
        (time - this._requestTime[user] > this.REQUEST_TIMEOUT)) {
      this._requestTime[user] = time;
      this._requestQueue.push(user);
      this._checkVCardQueue();
    }
  }
};

VCardStore.prototype._checkVCardQueue = function() {
  var time = new Date(), next;
  if (this._requestQueue.length < 1) {
    return;
  } else if ((time - this._fetchTime) > this.THROTTLE_TIMEOUT) {
    next = this._requestQueue.shift();
    this._fetchTime = time;

    // Request loadCard from delegate.
    this.loadCard(next);
  } else {
    setTimeout(this._checkVCardQueue.bind(this), this.THROTTLE_TIMEOUT);
  }
};

VCardStore.prototype._init = function() {
  var userId, profile;
  if (!this._storage) {
    return;
  }

  this._storage.keys().then(function(keys) {
    for(var i=0; i<keys.length; i++) {
      var k = keys[i];
      if (k.substr(0, this.PREFIX.length) == this.PREFIX) {
        this._storage.get(k).then(function(k, v) {
          try {
            userId = k.substr(this.PREFIX.length);
            this.users[userId] = JSON.parse(v);
          } catch(e) {
            console.warn(e);
          }
        }.bind(this, k));
      }
    }
  }.bind(this));
};
