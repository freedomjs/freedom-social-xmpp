function setupListeners(chat, displayWorker) {
  chat.on(displayWorker.port.emit.bind(displayWorker.port));

  displayWorker.port.on('login', function() {
    chat.emit('login');
  });

  displayWorker.port.on('logout', function() {
    chat.emit('logout');
  });

  displayWorker.port.on('send-message', function(message) {
    chat.emit('send-message', message);
  });
}

exports.setupListeners = setupListeners;
