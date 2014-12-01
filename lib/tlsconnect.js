/*jshint node:true*/

var util = require('util');
var net = require('net');

function toNumber(x) { 
  "use strict"; 
  return (x = Number(x)) >= 0 ? x : false; 
}

function isPipeName(s) {
  "use strict";
  return util.isString(s) && toNumber(s) === false;
}

// Returns an array [options] or [options, cb]
//
// It is the same as the argument of Socket.prototype.connect().
function __normalizeConnectArgs(args) {
  "use strict";
  var options = {};

  if (typeof(args[0]) === 'object') {
    // connect(options, [cb])
    options = args[0];
  } else if (isPipeName(args[0])) {
    // connect(path, [cb]);
    options.path = args[0];
  } else {
    // connect(port, [host], [cb])
    options.port = args[0];
    if (typeof(args[1]) === 'string') {
      options.host = args[1];
    }
  }

  var cb = args[args.length - 1];
  return typeof(cb) === 'function' ? [options, cb] : [options];
}


function normalizeConnectArgs(listArgs) {
  "use strict";
  var args = __normalizeConnectArgs(listArgs);
  var options = args[0];
  var cb = args[1];

  if (typeof(listArgs[1]) === 'object') {
    options = util._extend(options, listArgs[1]);
  } else if (typeof(listArgs[2]) === 'object') {
    options = util._extend(options, listArgs[2]);
  }

  return (cb) ? [options, cb] : [options];
}

function connect(/* [port, host], options, cb */) {
  "use strict";
  var args = __normalizeConnectArgs(arguments);
  var options = args[0];
  var cb = args[1];

  // Upgrade the socket to TLS, then invoke callback
  options.socket.secure(cb);

  // Return a new socket object using the same handle as the old socket.
  return new net.Socket({handle: options.socket._handle});
}

module.exports = connect;
connect.connect = connect;

