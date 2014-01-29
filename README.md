freedom-social-xmpp
===================

XMPP Social provider for freedom.js

This provider builds [node-xmpp](https://github.com/node-xmpp/node-xmpp) linked against the freedom.js socket API.
The interface conforms to the freedom.js social API.


Building
--------

    npm install
    grunt


Demo
----
The provided demo is a chrome chat application, demonstrating a pure JS app acting as an XMPP client.  The user interface is automatically linked against the demonstration app found in the [freedom chat demo](https://github.com/UWNetworksLab/freedom/tree/master/demo/chat).  To compile the demo, run:

    grunt demo
