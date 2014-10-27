/* global describe, it, beforeEach, afterEach, expect, spyOn*/
/* global FreedomTCP*/

describe("Tests for TCP Sockets", function() {
  "use strict";
  var socket;

  beforeEach(function() {
    socket = new FreedomTCP();
    spyOn(socket.fd, 'prepareSecure').and.callFake(function() {
      return Promise.resolve();
    });
  });

  it("calls prepareSecure when writing starttls", function(done) {
    var req = {oncomplete: function() {
      expect(socket.fd.prepareSecure).toHaveBeenCalled();
      done();
    }};
    socket.writeUtf8String(req,
        '<starttls xmlns="urn:ietf:params:xml:ns:xmpp-tls"/>');
  });

  it("does not call prepareSecure for writes other than starttls", function(done) {
    var req = {oncomplete: function() {
      expect(socket.fd.prepareSecure).not.toHaveBeenCalled();
      done();
    }};
    socket.writeUtf8String(req, 'hello');
  });

});
