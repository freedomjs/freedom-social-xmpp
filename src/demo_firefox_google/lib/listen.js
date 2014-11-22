function setupListeners(chat, displayWorker) {
  chat.on(displayWorker.port.emit.bind(displayWorker.port));

  displayWorker.port.on('login', function() {
    chat.login();
  });

  displayWorker.port.on('logout', function() {
    chat.logout();
  });

  displayWorker.port.on('send', function(data) {
    chat.send(data.to, data.msg);
  });
}

exports.setupListeners = setupListeners;
