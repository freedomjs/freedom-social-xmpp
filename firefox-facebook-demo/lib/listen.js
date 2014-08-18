function setupListeners(freedom, displayWorker) {
  freedom.on(displayWorker.port.emit.bind(displayWorker.port));

  displayWorker.port.on('login', function() {
    console.error('dborkan: in listen.js, got login ')
    freedom.emit("login");
  });

  displayWorker.port.on('logout', function() {
    freedom.emit("logout");
  });

  displayWorker.port.on('send-message', function(message) {
    freedom.emit("send-message", message);
  });
}

exports.setupListeners = setupListeners;
