exports.StringPrep = function(op) {
};

exports.StringPrep.prototype.prepare = function(value) {
  return value;
};

exports.toUnicode = function(value) {
  return encodeURIComponent(value);
};
