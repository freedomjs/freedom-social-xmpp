describe("Test DNS for lookup `foo`", function() {

  var foo_hostname = 'foo';
  var google_com_hostname = 'www.google.com';
  var family = 0;
  var dnsServer = '8.8.8.8';
  var dnsPort = 54;

  this.queryDNS = queryDNS;
  // Fake the queryDNS
  spyOn(this, 'queryDNS')
      .and.callFake(function(dnsServer, dnsQuery, callback) {
    // We convert to base 64 ascii to check the input is what we expect
    // because phantomjs can't do array comparison.
    if(btoa(dnsQuery) ==
       btoa(flattenDNS({query: foo_hostname, type: DNSTypes.A}))) {
      setTimeout(function(){
        callback({'resultCode':96,'address':dnsServer,'port':dnsPort,
                  'data': ArrayBuffers.hexStringToArrayBuffer("00.02.81.83.00.01.00.00.00.01.00.00.03.66.6f.6f.00.00.01.00.01.00.00.06.00.01.00.00.03.f3.00.40.01.61.c.72.6f.6f.74.2d.73.65.72.76.65.72.73.03.6e.65.74.00.05.6e.73.74.6c.64.c.76.65.72.69.73.69.67.6e.2d.67.72.73.03.63.6f.6d.00.78.b.b1.48.00.00.07.08.00.00.03.84.00.09.3a.80.00.01.51.80") });
      }, 1);
    } else if(btoa(dnsQuery) ==
       btoa(flattenDNS({query: google_com_hostname, type: DNSTypes.A}))) {
      setTimeout(function(){
        callback({'resultCode':112,'address':dnsServer,'port':dnsPort,
                  'data': ArrayBuffers.hexStringToArrayBuffer("00.02.81.80.00.01.00.05.00.00.00.00.03.77.77.77.06.67.6f.6f.67.6c.65.03.63.6f.6d.00.00.01.00.01.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b2.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b0.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b4.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b1.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b3") });
      }, 1);
    } else {
      throw(new Error("unexpected query to fake."));
    }
  });
  queryDNS = this.queryDNS;

  beforeEach(function() {

  });

  it("lookup domain (`foo`) having no A record", function(done) {
    var result = exports.lookup(foo_hostname,family);

    var addresses_;
    result.oncomplete = function(addresses) {
      addresses_ = addresses;
    }

    done(function() {
      expect(queryDNS).toHaveBeenCalledWith('8.8.8.8',foo_hostname);
      expect(addresses_).toEqual([]);
    });
  });


  it("lookup domain (`www.google.com`) having an a-record", function(done) {
    var result = exports.lookup(google_com_hostname,family);

    var addresses_;
    result.oncomplete = function(addresses) {
      addresses_ = addresses;
    }

    done(function() {
      expect(queryDNS).toHaveBeenCalledWith('8.8.8.8',google_com_hostname);
      expect(addresses_).toEqual(["74.125.226.178", "74.125.226.176", "74.125.226.180", "74.125.226.177", "74.125.226.179"]);
    });
  });


});
