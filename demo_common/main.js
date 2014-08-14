/**
 * Chat demo backend.
 * Because the Social API provides message passing primitives,
 * this backend simply forwards messages between the front-end and our Social provider
 * Note that you should be able to plug-and-play a variety of social providers
 * and still have a working demo
 *
 **/


var social = freedom.socialprovider();
var userList;    //Keep track of the roster
var clientList;
var myClientState;

function login() {
  userList = {};
  clientList = {};
  myClientState = null;
  social.login({
    agent: 'chatdemo',
    version: '0.1',
    url: '',
    interactive: true,
    rememberLogin: false
  }).then(function(ret) {
    myClientState = ret;
    console.log("Login successful: " + JSON.stringify(myClientState));
    if (ret.status == social.STATUS["ONLINE"]) {
      freedom.emit('recv-uid', ret.clientId);
      freedom.emit('recv-status', "online");
    } else {
      freedom.emit('recv-status', "offline");
    }
  }, function(err) {
    freedom.emit("recv-err", err);
  });
}

/** 
 * on a 'send-message' event from the parent (the outer page)
 * Just forward it to the Social provider
 **/
freedom.on('send-message', function(val) {
  social.sendMessage(val.to, val.message);
});
freedom.on('logout', social.logout.bind(social));
freedom.on('login', login);

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
  console.error('dborkan: got user profile ' + data.name);
  userList[data.userId] = data;
  updateBuddyList();
});

/**
 * On newly online or offline clients, let's update the roster
 **/
social.on('onClientState', function(data) {
  console.error('dborkan: got client state ' + data.status);
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
  updateBuddyList();
});

function updateBuddyList() {
  // Iterate over our roster and just send over clientId/userName where there is at least 1 client online
  var buddylist = [];
  for (var k in clientList) {
    if (clientList.hasOwnProperty(k)) {
      var client = clientList[k];
      var user = userList[client.userId];
      if (user) {
        var buddyInfo = {userName: user.name, clientId: client.clientId};
        buddylist.push(buddyInfo);
      }
    }
  }
  freedom.emit('recv-buddylist', buddylist);  
}

/** LOGIN AT START **/
login();