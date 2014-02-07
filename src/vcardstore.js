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
  var vcard = {},
      name, url, photo;
  if (message.attr.xmlns !== 'vcard-temp' ||
     !this.storage) {
    return;
  }

  name = message.getChildText('FN');
  url = message.getChildText('URL');
  photo = message.getChildText('PHOTO');

  if (name) {
    vcard.name = name;
  }
  if (url) {
    vcard.url = url;
  }
  if (photo && photo.getChildText('EXTVAL')) {
    vcard.imageUrl = photo.getChildText('EXTVAL');
  } else if (photo && photo.getChildText('TYPE') &&
            photo.getChildText('BINVAL')) {
    url = 'data:' +
      photo.getChildText('TYPE') + ';base64,' +
      photo.getChildText('BINVAL');
    vcard.imageData = url;
  }
  vcard.hash = hash;
  this.storage.set('vcard-' + user, JSON.stringify(vcard));
};

VCardStore.prototype.getVcard = function(user, hash, cb) {
  if (!this.storage) {
    return cb(false);
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
};

VCardStore.prototype.checkVCardQueue = function() {
  var time = new Date(), next;
  if (this.requestQueue.length < 1) {
    return;
  } else if ((time - this.fetchTime) > this.THROTTLE_TIMEOUT) {
    next = this.requestQueue.shift();
    this.fetchTime = time;
    
  } else {
    setTimeout(this.checkVCardQueue.bind(this), this.THROTTLE_TIMEOUT);
  }
};
