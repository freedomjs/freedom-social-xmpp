/**
 * Chat demo backend.
 * Because the Social API provides message passing primitives,
 * this backend simply forwards messages between the front-end and our Social provider
 * Note that you should be able to plug-and-play a variety of social providers
 * and still have a working demo
 *
 **/

var social = freedom.socialprovider();
var userList = {};    //Keep track of the roster
var clientList = {};
var myClientState = null;

/** 
 * on a 'send-message' event from the parent (the outer page)
 * Just forward it to the Social provider
 **/
freedom.on('send-message', function(val) {
  social.sendMessage(val.to, val.message);
});

/**
 * on an 'onMessage' event from the Social provider
 * Just forward it to the outer page
 */
social.on('onMessage', function(data) {
  freedom.emit('recv-message', data);
});

/**
 * On user profile changes, let's keep track of them
 **/
social.on('onUserProfile', function(data) {
  //Just save it for now
  userList[data.userId] = data;
});

/**
 * On newly online or offline clients, let's update the roster
 **/
social.on('onClientState', function(data) {
  if (data.status == social.STATUS["OFFLINE"]) {
    if (clientList.hasOwnProperty(data.clientId)) {
      delete clientList[data.clientId];
    }
  } else {  //Only track non-offline clients
    clientList[data.clientId] = data;
  }
  //If mine, send to the page
  if (myClientState !== null && data.clientId == myClientState.clientId) {
    if (data.status == social.STATUS["ONLINE"]) {
      freedom.emit('recv-status', "online");
    } else {
      freedom.emit('recv-status', "offline");
    }
  }
  // Iterate over our roster and just send over userId's where there is at least 1 client online
  var buddylist = [];
  for (var k in clientList) {
    if (clientList.hasOwnProperty(k)) {
      buddylist.push(k);
    }
  }
  freedom.emit('recv-buddylist', buddylist);
});

/** LOGIN AT START **/
social.login({
  agent: 'chatdemo',
  version: '0.1',
  url: '',
  interactive: true,
  rememberLogin: false,
  network: 'google'
}).then(function(ret) {
  myClientState = ret;
  console.log("!!!"+JSON.stringify(myClientState));
  if (ret.status == social.STATUS["ONLINE"]) {
    freedom.emit('recv-uid', ret.clientId);
    freedom.emit('recv-status', "online");
  } else {
    freedom.emit('recv-status', "offline");
  }
}, function(err) {
  freedom.emit("recv-err", err);
});
