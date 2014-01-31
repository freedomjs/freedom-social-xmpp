var freedomTCP = function() {
  this.fd = undefined;
  socket.create('tcp', {}).done(function(createInfo) {
    this.fd = createInfo.socketId;
    if (this._onstart) {
      this._onstart();
      delete this._onstart;
    }
    socket.on("onData", this._onRead);
  }.bind(this));

  this.bufferedReads = [];
  this.reading = true;
};

freedomTCP.prototype._onRead = function(readInfo) {
  if (readInfo.socketId === this.fd) {
    var byteview = new Uint8Array(readInfo.data),
        len = readInfo.data.byteLength,
        buf = new Buffer(byteview);

    if (this.reading) {
      this.onread(buf, 0, len);
    } else {
      this.bufferedReads.push({buf: buf, len: len});
    }
  }
}.bind(this);

freedomTCP.prototype.close = function(cb) {
  socket.off("onData", this._onRead);
	socket.disconnect(this.fd, cb);
	socket.destroy(this.fd);
	this.reading = false;
	this.writing = false;
};

freedomTCP.prototype.ref = function() {};
freedomTCP.prototype.unref = function() {};

freedomTCP.prototype.readStart = function() {
  var buffer;

  this.reading = true;
  if (this.bufferedReads) {
    // Reading might be stopped while flushing the buffer
    while (this.bufferedReads.length > 0 && this.reading) {
      buffer = this.bufferedReads.shift();
      this.onread(buffer.buf, 0, buffer.len);
    }
  }
};

freedomTCP.prototype.readStop = function() {
  this.reading = false;
  return false;
};

freedomTCP.prototype.shutdown = function(cb) {
	this.close(function(cb) {
	  cb.oncomplete();
	}.bind({}, cb));
};

freedomTCP.prototype._writeNative = function(req, data) {
  var promise = socket.write(this.fd, data.buffer);
  promise.done(function(req, writeinfo) {
		var bytes = writeinfo.bytesWritten;
		//console.log("wrote " + bytes + " chars to socket.");
		req.oncomplete(bytes, this, req);
  }.bind(this, req));
};

freedomTCP.prototype.writeBuffer = function(req, buf) {
  var data = buf.toArrayBuffer();
  this._writeNative(req, data);
};

freedomTCP.prototype.writeAsciiString = function(req, s) {
  var data = new Uint8Array(s.length), i = 0;
	for (; i < s.length; i += 1) {
		data[i] = s.charCodeAt(i);
	}
  this._writeNative(req, data);
};

freedomTCP.prototype.writeUtf8String = function(req, s) {
  var data = new Uint8Array(s.length), i = 0;
	for (; i < s.length; i += 1) {
		data[i] = s.charCodeAt(i);
	}
  this._writeNative(req, data);
};

freedomTCP.prototype.writeUcs2String = function(req, s) {
  var data = new Uint8Array(s.length), i = 0;
	for (; i < s.length; i += 1) {
		data[i] = s.charCodeAt(i);
	}
  this._writeNative(req, data);
};

//TODO: support writing multiple chunks together
//freedomTCP.prototype.writev

//TODO: Support server open/bind/listen.
//freedomTCP.prototype.open
//freedomTCP.prototype.bind
//freedomTCP.prototype.listen

freedomTCP.prototype.connect = function(cb, address, port) {
  if (!this.fd) {
    this._onstart = this.connect.bind(this, cb, address, port);
    return;
  }
  var promise = socket.connect(this.fd, address, port);
  var self = this;
  promise.done(function(status) {
    cb.oncomplete(status, self, cb, true, true);
  });
};

freedomTCP.prototype.bind6 = freedomTCP.prototype.bind;
freedomTCP.prototype.connect6 = freedomTCP.prototype.connect;

//TODO: implement getsockname / getpeername.
//freedomTCP.prototype.getsockname
//freedomTCP.prototype.getpeername
//freedomTCP.prototype.setNoDelay
//freedomTCP.prototype.setKeepAlive


exports.TCP = freedomTCP;
