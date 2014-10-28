window.addEventListener('load', function () {
  "use strict";
  //parent.postMessage({cmd: 'auth', message: credentials}, '*');

  window.addEventListener('message', function (msg) {
    window.temp = msg;
    console.log("!!!!");
    console.log(msg);
  }, true);
}, true);
