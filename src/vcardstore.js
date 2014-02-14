/*globals freedom:true,setTimeout */
/*jslint indent:2,white:true,sloppy:true */

var VCardStore = function () {
  if (freedom && freedom['core.storage']) {
    this.storage = freedom['core.storage']();
  }
  this.cards = {};
  this.requestTime = {};
  this.requestQueue = [];
  this.fetchTime = new Date();
};

/**
 * Overridden method for requesting status from a user.
 */
VCardStore.prototype.loadCard = function(user) {};

/**
 * Overridden method for handling changes to roster state.
 */
VCardStore.prototype.onChange = function(card) {};

// Time before a request is considered 'dead'.
VCardStore.prototype.REQUEST_TIMEOUT = 3000;

VCardStore.prototype.THROTTLE_TIMEOUT = 500;

VCardStore.prototype.updateVcard = function(user, hash, message) {
  var vcard = this.cards[user] || {},
      name, url, photo,
      changed = false;
  if (message.attr.xmlns !== 'vcard-temp' ||
     !this.storage) {
    return;
  }

  name = message.getChildText('FN');
  url = message.getChildText('URL');
  photo = message.getChildText('PHOTO');

  if (name) {
    if (name !== vcard.name) {
      changed = true;
    }
    vcard.name = name;
  }
  if (url) {
    if (url !== vcard.url) {
      changed = true;
    }
    vcard.url = url;
  }
  if (photo && photo.getChildText('EXTVAL')) {
    if (vcard.imageUrl !== photo.getChildText('EXTVAL')) {
      changed = true;
    }
    vcard.imageUrl = photo.getChildText('EXTVAL');
  } else if (photo && photo.getChildText('TYPE') &&
            photo.getChildText('BINVAL')) {
    url = 'data:' +
      photo.getChildText('TYPE') + ';base64,' +
      photo.getChildText('BINVAL');
    if (vcard.imageData !== url) {
      changed = true;
    }
    vcard.imageData = url;
  }
  vcard.hash = hash;
  this.storage.set('vcard-' + user, JSON.stringify(vcard));

  this.cards[user] = vcard;
  if (changed) {
    this.onChange(vcard);
  }
};

VCardStore.prototype.updatePropety = function(user, property, value) {
  if (!this.cards[user]) {
    this.cards[user] = {};
  }
  this.cards[user][property] = value;
};

VCardStore.prototype.getVcard = function(user, hash, cb) {
  if (!this.storage) {
    return cb(false);
  }

  if (this.cards[user] && (!hash || this.cards[user].hash === hash)) {
    return cb(this.cards[user]);
  }
  
  this.storage.get('vcard-' + user).done(function(cb, result) {
    if (result === null || result === undefined) {
      this.fetchVcard(user, cb);
    } else if (hash && hash !== result.hash) {
      this.fetchVcard(user, cb);
    } else {
      cb(result);
    }
  }.bind(this, cb));
};

VCardStore.prototype.fetchVcard = function(user, cb) {
  var time = new Date();
  if (!this.requestTime[user] || (time - this.requestTime[user] >
                                  this.REQUEST_TIMEOUT)) {
    this.requestTime[user] = time;
    this.requestQueue.push(user);
    this.checkVCardQueue();
  }
  cb({});
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
