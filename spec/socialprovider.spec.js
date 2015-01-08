describe("Tests for message batching in Social provider", function() {

  var xmppSocialProvider;
  var dateSpy;
  xmppClient = {
    clientId: 'Bob',
    events: {},
    send: function() {},
    addListener: function(eventName, handler) {
      xmppSocialProvider.client.events[eventName] = handler;
    }
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
    spyOn(window, "VCardStore").and.returnValue({
      loadCard: function() {},
      onUserChange: function() {},
      onClientChange: function() {},
      updateProperty: function() {},
      getClient: function(clientId) {
        return {
          status: "ONLINE"
        };
      }
    });

    // Mock VCardStore, Date and the client.
    xmppSocialProvider = new XMPPSocialProvider(null);
    xmppSocialProvider.client = xmppClient;
    spyOn(xmppSocialProvider.client, 'send');

    dateSpy = spyOn(Date, "now").and.returnValue(500);

    jasmine.clock().install();
  });

  afterEach(function(){
    jasmine.clock().uninstall();
  });

  it("add first message to batch and save time of message", function() {
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.messages.Bob).toEqual(['Hi']);
    expect(xmppSocialProvider.timeOfFirstMessageInBatch).toEqual(500);
  });

  it("set callback after first message is added to batch", function() {
    expect(xmppSocialProvider.sendMessagesTimeout).toBeNull();
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.sendMessagesTimeout).not.toBeNull();
  });

  it("send message after 100ms", function() {
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    jasmine.clock().tick(100);
    expect(xmppSocialProvider.client.send).toHaveBeenCalled();
  });

  it("timeout resets to 100ms after each message", function() {
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    jasmine.clock().tick(50);
    xmppSocialProvider.sendMessage('Bob', 'Hi again', function() {});
    jasmine.clock().tick(50);
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    expect(xmppSocialProvider.messages.Bob).toEqual(['Hi', 'Hi again']);
    jasmine.clock().tick(50);
    expect(xmppSocialProvider.client.send).toHaveBeenCalled();
  });

  it("do not reset timeout if oldest message is from >=2s ago", function() {
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
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    xmppSocialProvider.sendMessage('Alice', 'Hi', function() {});
    expect(xmppSocialProvider.client.send).not.toHaveBeenCalled();
    jasmine.clock().tick(100);
    expect(xmppSocialProvider.client.send.calls.count()).toEqual(2);
    var dest = xmppSocialProvider.client.send.calls.first().args[0].parent.attrs.to;
    if (dest !== 'Bob' && dest !== 'Alice') {
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
});
