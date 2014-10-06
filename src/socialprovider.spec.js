describe("Tests for message batching in Social provider", function() {

	var xmppSocialProvider;
	var dateSpy;
	freedom = {
		social: function() {
			return {
				STATUS: null,
				ERRCODE: null
			}
		}
	};

	beforeEach(function() {
		xmppSocialProvider = new XMPPSocialProvider(null);
		
		// Mock VCardStore, Date and the client.
		xmppSocialProvider.client = { 
    	clientId: 'Bob',
    	send: function() {} 
    };
    spyOn(xmppSocialProvider.client, 'send');
    spyOn(window, "VCardStore").and.returnValue({
    	loadCard: function() {},
    	onUserChange: function() {},
    	onClientChange: function() {},
    	getClient: function(clientId) {
    		return {
    			status: "ONLINE"
    		};
    	}
    });
    dateSpy = spyOn(Date, "now").and.returnValue(500);
    
    jasmine.clock().install();
	});

	afterEach(function(){
		jasmine.clock().uninstall();
	});

	it("add first message to batch and save time of message", function() {
    xmppSocialProvider.sendMessage('Bob', 'Hi', function() {});
    expect(xmppSocialProvider.messages).toEqual(['Hi']);    
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
		expect(xmppSocialProvider.messages).toEqual(['Hi', 'Hi again']); 
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

});
