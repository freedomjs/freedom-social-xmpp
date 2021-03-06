describe("Tests for message batching in Social provider", function() {

  var xmppSocialProvider;
  var dateSpy;
  xmppClient = {
    clientId: 'Bob',
    events: {},
    send: function() {},
    addListener: function(eventName, handler) {
      xmppSocialProvider.client.events[eventName] = handler;
    },
    removeAllListeners: function(eventName) {
      delete xmppSocialProvider.client.events[eventName];
    },
    end: function() {}
  };
  freedom = {
    social: function() {
      return {
        STATUS: null,
        ERRCODE: null
      }
    }
  };

  beforeEach(function() {
    var knownClients = {
      'Alice': {clientId: 'Alice', status: 'ONLINE'},
      'Bob': {clientId: 'Bob', status: 'ONLINE'},
      'myId': {clientId: 'myId', status: 'ONLINE'},
      'fromId': {clientId: 'fromId', status: 'ONLINE'}
    };
    spyOn(window, "VCardStore").and.returnValue({
      loadCard: function() {},
      onUserChange: function() {},
      onClientChange: function() {},
      updateProperty: function(clientId, property, value) {
        if (property == 'status') {
          knownClients[clientId] = {clientId: clientId, status: value};
        }
      },
      refreshContact: function() {},
      getClient: function(clientId) {
        // getClient defaults status=OFFLINE if the client is unknown
        if (knownClients[clientId]) {
          return knownClients[clientId];
        } else {
          return {clientId: clientId, status: 'OFFLINE'};
        }
      },
      hasClient: function(clientId) {
        return knownClients[clientId] ? true : false;
      }
    });

    // Mock VCardStore, Date and the client.
    function dispatchEvent(eventType, data) {};
    xmppSocialProvider = new XMPPSocialProvider(dispatchEvent);
    xmppSocialProvider.id = 'myId';
    xmppSocialProvider.loginOpts = {};

    jasmine.clock().install();
  });

  afterEach(function(){
    jasmine.clock().uninstall();
  });

  it("add first message to batch and save time of message", function() {
    xmppSocialProvider.client = xmppClient;
    dateSpy = spyOn(Date, "now").and.returnValue(500);
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.messages.Bob[0].message).toEqual('Hi');
    expect(xmppSocialProvider.timeOfFirstMessageInBatch).toEqual(500);
  });

  it("set callback after first message is added to batch", function() {
    xmppSocialProvider.client = xmppClient;
    expect(xmppSocialProvider.sendMessagesTimeout).toBeNull();
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.sendMessagesTimeout).not.toBeNull();
  });

  it("send message after 100ms", function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider.client, 'send');
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    jasmine.clock().tick(100);
    expect(xmppSocialProvider.client.send).toHaveBeenCalled();
  });


  it("calls callback after send", function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider.client, 'send');
    var spy = jasmine.createSpy('callback');
    xmppSocialProvider.sendMessage('Bob', 'Hi', spy);
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    jasmine.clock().tick(100);
    expect(xmppSocialProvider.client.send).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it("timeout resets to 100ms after each message", function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider.client, 'send');
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    jasmine.clock().tick(50);
    xmppSocialProvider.sendMessage('Bob', 'Hi again', function() {});
    jasmine.clock().tick(50);
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    expect(xmppSocialProvider.messages.Bob.length).toEqual(2);
    expect(xmppSocialProvider.messages.Bob).toEqual([{
      message: 'Hi',
      continuation: jasmine.any(Function)
    }, {
      message: 'Hi again',
      continuation: jasmine.any(Function)
    }]);
    jasmine.clock().tick(50);
    expect(xmppSocialProvider.client.send).toHaveBeenCalled();
  });

  it("do not reset timeout if oldest message is from >=2s ago", function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider.client, 'send');
    dateSpy = spyOn(Date, "now").and.returnValue(500);
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    // First message sent at 500ms.
    expect(xmppSocialProvider.timeOfFirstMessageInBatch).toEqual(500);
    // Send messages every 50ms for 1950ms.
    for (var i = 1; i < 40; i++) {
      jasmine.clock().tick(50);
      dateSpy.and.returnValue(500 + i*50);
      xmppSocialProvider.sendMessage('Bob', 'Hi again', function() {});
      expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    }
    // Check that 1950ms have "elapsed".
    expect(Date.now()).toEqual(2450);
    // Increment clock again.
    jasmine.clock().tick(50);
    dateSpy.and.returnValue(2500);
    // At this point, the next sendMessage should not trigger the timeout
    // to reset (since the oldest message is now 2s old). Instead, the timeout
    // created 50ms ago should execute in another 50ms.
    xmppSocialProvider.sendMessage('Bob', 'Hi again', function() {});
    jasmine.clock().tick(50);
    expect(xmppSocialProvider.client.send).toHaveBeenCalled();
  });

  it("sends message to correct destinations", function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider.client, 'send');
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    xmppSocialProvider.sendMessage('Alice', 'Hi', function() {});
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    jasmine.clock().tick(100);
    expect(xmppSocialProvider.client.send.calls.count()).toEqual(2);
    var dest = xmppSocialProvider.client.send.calls.first().args[0].parent.attrs.to;
    // Destination shold be either bob or alice.
    if (dest === 'Bob') {
      expect(xmppSocialProvider.client.send.calls.mostRecent().args[0].parent.attrs.to)
          .toEqual('Alice');
    } else if (dest === 'Alice') {
      expect(xmppSocialProvider.client.send.calls.mostRecent().args[0].parent.attrs.to)
          .toEqual('Bob');
    } else {
      // If it isn't either, this expectation will certainly fail.
      expect(dest).toEqual('Bob');
    }
  });

  it('sets status to OFFLINE when client disconnected', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    xmppSocialProvider.connect();
    xmppSocialProvider.id = 'id'
    expect(xmppSocialProvider.client.events['offline']).toBeDefined();
    spyOn(xmppSocialProvider.vCardStore, 'updateProperty');
    xmppSocialProvider.client.events['offline']();
    expect(xmppSocialProvider.vCardStore.updateProperty)
        .toHaveBeenCalledWith('id', 'status', 'OFFLINE');
  });

  it('disconnects when no reply to ping', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    spyOn(xmppSocialProvider, 'logout');
    xmppSocialProvider.connect();
    xmppSocialProvider.ping_();
    jasmine.clock().tick(xmppSocialProvider.MAX_MS_PING_REPSONSE_ + 10);
    expect(xmppSocialProvider.logout.calls.count()).toEqual(1);
  });

  it('stays online when ping response received', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    spyOn(xmppSocialProvider, 'logout');
    xmppSocialProvider.connect();
    xmppSocialProvider.ping_();
    xmppSocialProvider.onMessage(
        new window.XMPP.Element('iq', {type: 'result'}));
    jasmine.clock().tick(xmppSocialProvider.MAX_MS_PING_REPSONSE_ + 10);
    expect(xmppSocialProvider.logout).not.toHaveBeenCalled();
  });

  it('pings once per minute if no message received', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    // Set Math.random so that we immediately hit the once-per-minute ping case.
    spyOn(Math, 'random').and.returnValue((new Date()).getSeconds() / 60);
    spyOn(xmppSocialProvider, 'ping_')
    xmppSocialProvider.connect(function() {});
    // Emit online event to start polling loop.
    xmppSocialProvider.client.events['online']();
    jasmine.clock().tick(1001);
    expect(xmppSocialProvider.ping_).toHaveBeenCalled();
    // logout must be called to clearInterval on the polling loop
    xmppSocialProvider.logout();
  });

  it('does not ping once per minute if a message is received', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    // Set Math.random so that we immediately hit the once-per-minute ping case.
    spyOn(Math, 'random').and.returnValue((new Date()).getSeconds() / 60);
    spyOn(xmppSocialProvider, 'ping_')
    xmppSocialProvider.connect(function() {});
    // Emit online event to start polling loop.
    xmppSocialProvider.client.events['online']();
    // Send a message before the next polling loop.
    xmppSocialProvider.onMessage(
        new window.XMPP.Element('iq', {type: 'result'}));
    jasmine.clock().tick(1001);
    expect(xmppSocialProvider.ping_).not.toHaveBeenCalled();
    // logout must be called to clearInterval on the polling loop
    xmppSocialProvider.logout();
  });

  // TODO: re-enable this test when we figure out
  // https://github.com/freedomjs/freedom-social-xmpp/issues/118
  // it('detects sleep and pings immediately', function() {
  //   var nowMs = 0;
  //   dateSpy = spyOn(Date, "now").and.callFake(function() { return nowMs; });
  //   spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
  //   var setIntervalCallbacks = [];
  //   spyOn(window, 'setInterval').and.callFake(function(callback, intervalMs) {
  //     setIntervalCallbacks.push(callback);
  //   });
  //   spyOn(xmppSocialProvider, 'ping_');

  //   // Connect and emit online event to start polling loop.
  //   xmppSocialProvider.connect(function() {});
  //   xmppSocialProvider.client.events['online']();

  //   // Advance the clock by 2010 ms and invoke callbacks.
  //   nowMs = 2010;
  //   jasmine.clock().tick(2010);
  //   setIntervalCallbacks.map(function(callback) { callback(); });

  //   // Expect sleep to have been detected and ping to be invoked.
  //   expect(xmppSocialProvider.ping_).toHaveBeenCalled();
  //   // logout must be called to clearInterval on the polling loop
  //   xmppSocialProvider.logout();
  // });

  it('parses JSON encoded arrays', function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider, 'dispatchEvent');
    var fromClient = xmppSocialProvider.vCardStore.getClient('fromId');
    var toClient = xmppSocialProvider.vCardStore.getClient('myId');
    xmppSocialProvider.receiveMessage('fromId', JSON.stringify(['abc', 'def']));
    expect(xmppSocialProvider.dispatchEvent).toHaveBeenCalledWith(
        'onMessage', {from: fromClient, to: toClient, message: 'abc'});
    expect(xmppSocialProvider.dispatchEvent).toHaveBeenCalledWith(
        'onMessage', {from: fromClient, to: toClient, message: 'def'});
  });

  it('does not parse JSON that is not an array', function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider, 'dispatchEvent');
    var jsonString = '{key: "value"}';
    var fromClient = xmppSocialProvider.vCardStore.getClient('fromId');
    var toClient = xmppSocialProvider.vCardStore.getClient('myId');
    xmppSocialProvider.receiveMessage('fromId', jsonString);
    expect(xmppSocialProvider.dispatchEvent).toHaveBeenCalledWith(
        'onMessage', {from: fromClient, to: toClient, message:jsonString});
  });

  it('does not parse non-JSON messages', function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider, 'dispatchEvent');
    var fromClient = xmppSocialProvider.vCardStore.getClient('fromId');
    var toClient = xmppSocialProvider.vCardStore.getClient('myId');
    xmppSocialProvider.receiveMessage('fromId', 'hello');
    expect(xmppSocialProvider.dispatchEvent).toHaveBeenCalledWith(
        'onMessage', {from: fromClient, to: toClient, message: 'hello'});
  });

  it('end event rejects connect if logging in', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    var continuationSpy = jasmine.createSpy('spy');
    xmppSocialProvider.connect(continuationSpy);
    spyOn(xmppSocialProvider, 'logout');
    xmppSocialProvider.client.events['end']();
    expect(xmppSocialProvider.logout).not.toHaveBeenCalled();
    expect(continuationSpy).toHaveBeenCalledWith(undefined,
        {errcode: 'LOGIN_FAILEDCONNECTION', message: 'Received end event'});
  });

  it('end event calls logout if online', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    xmppSocialProvider.connect(function() {});
    spyOn(xmppSocialProvider, 'logout');
    xmppSocialProvider.client.events['online']();
    xmppSocialProvider.client.events['end']();
    expect(xmppSocialProvider.logout.calls.count()).toEqual(1);
  });

  it('end event is ignored when user has logged out', function() {
    spyOn(window.XMPP, 'Client').and.returnValue(xmppClient);
    var continuationSpy = jasmine.createSpy('spy');
    xmppSocialProvider.connect(continuationSpy);
    spyOn(xmppSocialProvider, 'logout');
    xmppSocialProvider.client.events['online']();
    expect(continuationSpy.calls.count()).toBe(1);
    xmppSocialProvider.logout();
    expect(xmppSocialProvider.logout.calls.count()).toBe(1);
    expect(continuationSpy.calls.count()).toBe(1);
  });

  it('creates ONLINE_WITH_OTHER_APP client for messages from unknown client',
      function() {
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider, 'dispatchEvent');

    var message = new window.XMPP.Element(
        'message', {type: 'chat', from: 'unknownClient'})
        .c('body').t('hello').up().up();
    xmppSocialProvider.onMessage(message);
    expect(xmppSocialProvider.dispatchEvent).toHaveBeenCalledWith(
        'onMessage',
        {
          from: {clientId: 'unknownClient', status: 'ONLINE_WITH_OTHER_APP'},
          to: {clientId: 'myId', status: 'ONLINE' },
          message: 'hello'
        });
  });
});
