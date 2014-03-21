# freedom-social-xmpp

XMPP Social provider for freedom.js

This provider builds [node-xmpp](https://github.com/node-xmpp/node-xmpp) linked against the freedom.js socket API. The interface conforms to the `freedom.js` social API.

Note that `net` is almost identical to node-js's net, but just changes to use freedom's tcp provider.


## Building

````
    npm install
    grunt
````

Note that `node-stringprep` has native code and so it may have to recompile node (using gyp). This sometimes fails on the binary (e.g. on a mac) if it tries to be done in user-space but node is in super-user space. The fix for that is to install `node-stringprep` globally as super-user:
```
    sudo npm install -g node-stringprep
```

## Demo

The provided demo is a chrome chat application, demonstrating a pure JS app acting as an XMPP client.  The user interface is automatically linked against the demonstration app found in the [freedom chat demo](https://github.com/UWNetworksLab/freedom/tree/master/demo/chat).  To compile the demo, run:

```
    grunt demo
```


