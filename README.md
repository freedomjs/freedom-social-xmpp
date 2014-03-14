freedom-social-xmpp
===================

XMPP Social provider for freedom.js

This provider encapsulates [node-xmpp](https://github.com/node-xmpp/node-xmpp)
within against the freedom.js socket API.
The interface conforms to the freedom.js social API.

Using
-----
The Provider can be referenced locally from the prebuilt version distributed
by NPM. Install the dependency through NPM as standard and you should be done.

    npm --save freedom-social-xmpp

Demo
----
The provided demo is a chrome chat application, demonstrating a pure JS app
acting as an XMPP client.  The user interface is automatically linked against
the demonstration app found in the
[freedom chat demo](https://github.com/UWNetworksLab/freedom/tree/master/demo/chat).
To compile the demo, run:

    grunt demo

Building
--------

    npm install
    grunt


Testing
-------

    npm install
    grunt test
