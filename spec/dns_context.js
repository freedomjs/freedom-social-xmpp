var exports = {};
var freedom = {};

// Some helper functions for hex strings and Array Buffers.
var ArrayBuffers;
(function (ArrayBuffers) {
    /**
    * Converts an ArrayBuffer to a string.
    *
    * @param {ArrayBuffer} buffer The buffer to convert.
    */
    function arrayBufferToString(buffer) {
        var bytes = new Uint8Array(buffer);
        var a = [];
        for (var i = 0; i < bytes.length; ++i) {
            a.push(String.fromCharCode(bytes[i]));
        }
        return a.join('');
    }
    ArrayBuffers.arrayBufferToString = arrayBufferToString;

    /**
    * Converts a string to an ArrayBuffer.
    *
    * @param {string} s The string to convert.
    */
    function stringToArrayBuffer(s) {
        var buffer = new ArrayBuffer(s.length);
        var bytes = new Uint8Array(buffer);
        for (var i = 0; i < s.length; ++i) {
            bytes[i] = s.charCodeAt(i);
        }
        return buffer;
    }
    ArrayBuffers.stringToArrayBuffer = stringToArrayBuffer;

    /**
    * Creates a hex char code e.g. 2 => 0x02
    *
    * @param {number} n The number to convert
    */
    function numberToHex(n) {
        if (n < 10) {
            return n.toString();
        } else {
            return n.toString(16);
        }
    }
    ArrayBuffers.numberToHex = numberToHex;

    /**
    * Converts an ArrayBuffer to a string of hex codes and interpretations as
    * a char code.
    *
    * @param {ArrayBuffer} buffer The buffer to convert.
    */
    function arrayBufferToHexString(buffer) {
        var bytes = new Uint8Array(buffer);
        var a = [];
        for (var i = 0; i < buffer.byteLength; ++i) {
            a.push(numberToHex(bytes[i]));
        }
        return a.join('.');
    }
    ArrayBuffers.arrayBufferToHexString = arrayBufferToHexString;

    /**
    * Converts an HexString to an ArrayBuffer.
    *
    * @param {string} hexString The hexString to convert.
    */
    function hexStringToArrayBuffer(hexString) {
        var hexChars = hexString.split('.');
        var buffer = new ArrayBuffer(hexChars.length);
        var bytes = new Uint8Array(buffer);
        for (var i = 0; i < hexChars.length; ++i) {
            bytes[i] = parseInt('0x' + hexChars[i]);
        }
        return buffer;
    }
    ArrayBuffers.hexStringToArrayBuffer = hexStringToArrayBuffer;
})(ArrayBuffers || (ArrayBuffers = {}));
