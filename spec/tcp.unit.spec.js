/* global jasmine, describe, it, beforeEach, afterEach, expect, spyOn*/
/* global events, FreedomTCP*/

describe("Tests for TCP Sockets", function() {
  "use strict";
  var socket;

  beforeEach(function() {
    socket = new FreedomTCP();
    socket.onread = jasmine.createSpy('on read');
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

  it('calls on read with negative -1 when socket is disconnected', function() {
    expect(events.onDisconnect).toBeDefined();
    events.onDisconnect();
    expect(socket.onread).toHaveBeenCalledWith(-1);
  });

});
