function setupListeners(freedom, displayWorker) {
  freedom.on('recv-buddylist', function(val) {
    displayWorker.port.emit('recv-buddylist', val);
  });

  freedom.on('recv-message', function(data) {
    displayWorker.port.emit('recv-message', data);
  });

  freedom.on('recv-uid', function(data) {
    displayWorker.port.emit('recv-uid', data);
  });

  freedom.on('recv-status', function(msg) {
    displayWorker.port.emit('recv-status', msg);
  });

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
