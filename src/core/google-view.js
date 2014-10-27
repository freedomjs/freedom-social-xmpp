window.addEventListener('load', function () {
  "use strict";
  //parent.postMessage({cmd: 'auth', message: credentials}, '*');

  window.addEventListener('message', function (msg) {
    console.log("!!!!");
    console.log(msg);
  }, true);
}, true);
