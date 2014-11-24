/*jslint moz:true, node:true, sloppy:true */

function setupListeners(chat, displayWorker) {
  chat.on(displayWorker.port.emit.bind(displayWorker.port));

  displayWorker.port.on('login', function() {
    console.log('login');
    chat.login();
  });

  displayWorker.port.on('logout', function() {
    console.log('logout');
    chat.logout();
  });

  displayWorker.port.on('send', function(data) {
    console.log('send: ' + JSON.stringify(data));
    chat.send(data.to, data.msg);
  });

  displayWorker.port.on('test', function(data) {
    console.log('Test message: ' + data);
  });
}

exports.setupListeners = setupListeners;
