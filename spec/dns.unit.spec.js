describe("Tests for DNS lookup", function() {
  "use strict";

  var family = 0;
  var dnsServer = '8.8.8.8';
  var dnsPort = 54;

  var fooHostname = 'foo';
  var fooDnsQuery = flattenDNS({query: fooHostname, type: DNSTypes.A});
  var fooDnsQueryHexString = ArrayBuffers.arrayBufferToHexString(
      fooDnsQuery);
  var fooDnsResponse = {'resultCode':96,'address':dnsServer,'port':dnsPort,
        'data': ArrayBuffers.hexStringToArrayBuffer("00.02.81.83.00.01.00.00.00.01.00.00.03.66.6f.6f.00.00.01.00.01.00.00.06.00.01.00.00.03.f3.00.40.01.61.c.72.6f.6f.74.2d.73.65.72.76.65.72.73.03.6e.65.74.00.05.6e.73.74.6c.64.c.76.65.72.69.73.69.67.6e.2d.67.72.73.03.63.6f.6d.00.78.b.b1.48.00.00.07.08.00.00.03.84.00.09.3a.80.00.01.51.80") };

  var googleComHostname = 'www.google.com';
  var googleDnsQuery =
      flattenDNS({query: googleComHostname, type: DNSTypes.A});
  var googleDnsQueryHexString = ArrayBuffers.arrayBufferToHexString(
      googleDnsQuery);
  var googleDnsResponse = {'resultCode':112,'address':dnsServer,'port':dnsPort,
        'data': ArrayBuffers.hexStringToArrayBuffer("00.02.81.80.00.01.00.05.00.00.00.00.03.77.77.77.06.67.6f.6f.67.6c.65.03.63.6f.6d.00.00.01.00.01.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b2.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b0.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b4.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b1.c0.c.00.01.00.01.00.00.01.29.00.04.4a.7d.e2.b3") };

  // Note that the first 16 bits are a name/id for the query, so thet may
  // differ, but the query is still equivalent.
  function equivalentDnsQueries(query1, query2) {
    var query1HexString = ArrayBuffers.arrayBufferToHexString(query1);
    var query2HexString = ArrayBuffers.arrayBufferToHexString(query2);
    return query1HexString.substring(7,query1HexString.length) ===
           query2HexString.substring(7,query2HexString.length);
  }

  var unSpiedQueryDNS = queryDNS;

  beforeEach(function() {
    // Fake the queryDNS to use our predefined results.
    this.queryDNS = unSpiedQueryDNS;
    spyOn(this, 'queryDNS')
        .and.callFake(function(dnsServer, dnsQuery, callback) {
      // We convert to base 64 ascii to check the input is what we expect
      // because phantomjs can't do array comparison.
      if(equivalentDnsQueries(dnsQuery, fooDnsQuery)) {
        setTimeout(function(){callback(fooDnsResponse);}, 1);
      } else if(equivalentDnsQueries(dnsQuery, googleDnsQuery)) {
        setTimeout(function(){callback(googleDnsResponse);}, 1);
      } else {
        throw(new Error("unexpected query to fake: " + dnsQuery));
      }
    });
    // Rebind to the spied version.
    queryDNS = this.queryDNS;
  });


  it("lookup invokes callback with hostname", function(done) {
    exports.lookup(googleComHostname, family,
        function(error, hostname, familyFromCallback) {
          expect(error).toEqual(null);
          expect(hostname).toEqual(googleComHostname);
          expect(familyFromCallback).toEqual(family);
          done();
        });
  });


  it("isIP('0.0.0.0') === 4", function() {
    expect(isIP('0.0.0.0')).toBe(4);
  });
  it("isIP('143.44.3.254') === 4", function() {
    expect(isIP('143.44.3.254')).toBe(4);
  });
  it("isIP('255.255.255.255') === 4", function() {
    expect(isIP('255.255.255.255')).toBe(4);
  });
  it("isIP('foo') === 0", function() {
    expect(isIP('foo')).toBe(0);
  });
  it("isIP('') === 0", function() {
    expect(isIP('')).toBe(0);
  });
  it("isIP('www.google.com') === 0", function() {
    expect(isIP('www.google.com')).toBe(0);
  });

});
