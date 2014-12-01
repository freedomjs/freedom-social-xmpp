/*jshint node:true*/
exports.StringPrep = function(op) {
  "use strict";
};

exports.StringPrep.prototype.prepare = function(value) {
  "use strict";
  return value;
};

exports.toUnicode = function(value) {
  "use strict";
  return encodeURIComponent(value);
};
