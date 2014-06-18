function setupListeners(freedom, displayWorker) {
	freedom.on(displayWorker.port.emit.bind(displayWorker.port));

  displayWorker.port.on('logIn', function() {
    freedom.emit("login");
  });

  displayWorker.port.on('logOut', function() {
    freedom.emit("logout");
  });

  displayWorker.port.on('send-message', function(message) {
    freedom.emit("send-message", message);
  });
}

exports.setupListeners = setupListeners;
