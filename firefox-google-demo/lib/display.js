/**
 * attached to main window as a content script, defines interaction
 * between display page and add-on environment.
 */

var buddylist = document.getElementById('buddylist');
var activeId;

self.port.on("setUp", function(freedom) {
  var login = document.getElementById("login")
  login.onclick = function() {
    if (login.innerHTML == 'log in') {
      self.port.emit("logIn");
    } else {
      login.innerHTML = "log in";
      document.getElementById('uid').innerHTML = "";
      document.getElementById('msg-input').style.visibility = 'hidden';
      buddylist.innerHTML = "";
      document.getElementById('messagelist').innerHTML = '';
      self.port.emit("logOut");
    }
  };
});

function appendLog(elt) {
  var log = document.getElementById('messagelist');
  while (log.childNodes.length > 36) {
    log.removeChild(log.firstChild);
  }
  log.appendChild(elt);
  var br = document.createElement('br');
  log.appendChild(br);
  br.scrollIntoView();
}
var input = document.getElementById('msg-input');
input.onkeydown = function(evt) {
  if (evt.keyCode == 13) {
    var text = input.value;
    input.value = "";
    appendLog(document.createTextNode("You: " + text + " To " + activeId));
    self.port.emit('send-message', {to: activeId, message: text});
  }
};

self.port.on("recv-buddylist", function(val){
   var onClick = function(jid, child) {
    if (activeId != jid) {
      activeId = jid;
    } else {
      activeId = undefined;
      child.innerHTML = val[i];
    }
    document.getElementById('msg-input').focus();
  };

  buddylist.innerHTML = "<b>Buddylist</b>";

  // Create a new element for each buddy
  for (var i in val) {
    var child = document.createElement('div');
    child.innerHTML = val[i];
    child.addEventListener('click',
                           onClick.bind(this, val[i], child), true);
    buddylist.appendChild(child);
  }
});

self.port.on("recv-message", function(data){
  var message = data.from.userId + ": " + data.message;
  appendLog(document.createTextNode(message));
});

self.port.on("recv-uid", function(data){
  document.getElementById('uid').innerHTML = "Logged in as " + data;
  document.getElementById('msg-input').style.visibility = '';
  var loginButton = document.getElementById("login");
  loginButton.innerHTML = "log out";
});

