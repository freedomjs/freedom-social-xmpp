/*globals freedom:true,setTimeout,console,VCardStore,XMPPSocialProvider */
/*jslint indent:2,white:true,sloppy:true */

/**
 * Begin the login view, potentially prompting for credentials.
 * @method login
 * @param {Object} loginOpts Setup information about the desired network.
 *   keys used by this provider include
 *   agent - The user agent to expose on the network
 *   url - The url of the client connecting
 *   version - The version of the client.
 *   network - A string used to differentiate this provider in events.
 */
XMPPSocialProvider.prototype.login = function(loginOpts, continuation) {
  if (loginOpts) {
    this.loginOpts = loginOpts;
  }

  if (!this.credentials) {
    if (this.view) {
      this.view.close();
    }
    this.view = freedom['core.view']();
    this.view.once('message', this.onCredentials.bind(this, continuation));
    this.view.open('XMPPLogin', {file: 'xmpp-view.html'}).then(this.view.show.bind(this.view));
    return;
  }

  if (!this.client) {
    this.initializeState();
  }
  this.connect(continuation);
};
