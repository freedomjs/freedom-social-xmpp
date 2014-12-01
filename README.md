freedom-social-xmpp
===================
[![Build Status](https://travis-ci.org/freedomjs/freedom-social-xmpp.svg?branch=master)](https://travis-ci.org/freedomjs/freedom-social-xmpp)

XMPP Social provider for freedom.js

This provider builds [node-xmpp](https://github.com/node-xmpp/node-xmpp) linked against the freedom.js socket API. The interface conforms to the `freedom.js` social API.

Note that `net` is almost identical to node-js's net, but just changes to use freedom's tcp provider.

## Using

The Provider can be referenced locally from the prebuilt version distributed
by NPM. Install the dependency through NPM as standard and you should be done.

```
    npm --save freedom-social-xmpp
```


## Building

````
    npm install
    grunt
````

Note that `node-stringprep` has native code, so it may have to recompile node (using gyp). This can fail (e.g. on a mac) when attempted in user-space but node is in super-user space. A fix is to install `node-stringprep` globally as super-user:

```
    sudo npm install -g node-stringprep
```


### Building the Demo

The provided demo is a chrome chat application, demonstrating a pure JS app acting as an XMPP client.  The user interface is automatically linked against the demonstration app found in the [freedom chat demo](https://github.com/UWNetworksLab/freedom/tree/master/demo/chat). To compile the demo, run:

```
    grunt demo
```


### Running Tests

```
    grunt test
```
