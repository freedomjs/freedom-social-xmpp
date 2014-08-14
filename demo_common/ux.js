/*
 * These functions provide interaction for the freedom.js chat demo.
 */
if (typeof window.freedom === 'undefined') {
  // In firefox window.freedom is not defined
  // instead communicate with main.js wich is responsible for forwarding messages to
  // freedom.
  // TODO(salomege): figure out how to split this code into common ux and
  // firefox specific files.
  window.freedom = {
    on: self.port.on.bind(self.port),
    emit: self.port.emit.bind(self.port),
  }
}

window.onload = function() {
  document.getElementById('msg-input').focus();
  // If messages are going to a specific user, store that here.
  var activeId;
  var logInOrOut = document.getElementById('log-in-or-out');
  var buddylist = document.getElementById('buddylist');
  var uidElement = document.getElementById('uid');

  function clearLog() {
    var log = document.getElementById('messagelist');
    log.innerHTML = "";
  }

  function clearBuddylist() {
    buddylist.innerHTML = "<b>Buddylist</b>";
  }

  function appendLog(elt) {
    var log = document.getElementById('messagelist');
    //Trim old messages
    while (log.childNodes.length > 36) {
      log.removeChild(log.firstChild);
    }
    log.appendChild(elt);
    var br = document.createElement('br');
    log.appendChild(br);
    br.scrollIntoView();
  }

  // on changes to the buddylist, redraw entire buddylist
  window.freedom.on('recv-buddylist', function(val) {
    console.log('dborkan: recv-buddylist called');
    if (logInOrOut.textContent === 'Log in') {
      // We are already logging out, ignore buddylist.
      return;
    }
    var onClick = function(jid, child) {
      if (activeId != jid) {
        activeId = jid;
        child.innerHTML = '[' + val[i].userName + ', ' + val[i].clientId + ']';
      } else {
        activeId = undefined;
        child.innerHTML = val[i].userName + ', ' + val[i].clientId;
      }
      console.log("Messages will be sent to: " + activeId);
      document.getElementById('msg-input').focus();
    };

    clearBuddylist();

    // Create a new element for each buddy
    console.log('dborkan: val.length ' + val.length);
    for (var i in val) {
      console.log('dborkan: adding buddy i ' + i);
      var child = document.createElement('div');
      child.innerHTML = val[i].userName + ', ' + val[i].clientId;
      // If the user clicks on a buddy, change our current destination for messages
      child.addEventListener('click', onClick.bind(this, val[i].clientId, child), true);
      buddylist.appendChild(child);
    }
  });
  // On new messages, append it to our message log
  window.freedom.on('recv-message', function(data) {
    var message = data.from.userId + ": " + data.message;
    appendLog(document.createTextNode(message));
  });

  // Display our own userId when we get it
  window.freedom.on('recv-uid', function(data) {
    uidElement.textContent = "Logged in as: " + data;
    logInOrOut.textContent = 'Log out';
  });

  // Display the current status of our connection to the Social provider
  window.freedom.on('recv-status', function(msg) {
    if (msg && msg == 'online') {
      document.getElementById('msg-input').disabled = false;
    } else {
      document.getElementById('msg-input').disabled = true;
    }
    clearLog();
    var elt = document.createElement('b');
    elt.appendChild(document.createTextNode('Status: ' + msg));
    appendLog(elt);
  });

  // Listen for the enter key and send messages on return
  var input = document.getElementById('msg-input');
  input.onkeydown = function(evt) {
    if (evt.keyCode == 13) {
      var text = input.value;
      input.value = "";
      appendLog(document.createTextNode("You: " + text));
      window.freedom.emit('send-message', {to: activeId, message: text});
    }
  };

  logInOrOut.onclick = function() {
    if (logInOrOut.textContent == 'Log out') {
      // Tell parent window to logout (invoke social.logout),
      // then update UI.
      window.freedom.emit('logout');
      logInOrOut.textContent = 'Log in';
      uidElement.textContent = '';
      clearBuddylist();
      clearLog();
    } else {
      // Tell parent window to login (invoke social.login)
      // Element text will be updated in recv-uid handler.
      window.freedom.emit('login');
    }
  }
};
