var freedomTCP = function() {
  this.fd = undefined;

  // Strongly bind _onRead.
  this._onRead = this._onRead.bind(this);
  socket.create('tcp', {}).then(function(createInfo) {
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

    //View read data for debugging:
    //var str = String.fromCharCode.apply(null, byteview);
    //console.warn('read ' + len +': ' + str);

    if (this.reading) {
      this.onread(len, buf);
    } else {
      this.bufferedReads.push({buf: buf, len: len});
    }
  }
}

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
      this.onread(buffer.len, buffer.buf);
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
  promise.then(function(req, writeinfo) {
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
  //View write data for debugging:
  //console.warn('wrote ' + s.length + ': ' + s);

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
  promise.then(function(status) {
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
