/*
 * Test accounts should already be established as contacts on GTalk.
 *
 * GTalk integration tests skip the interactive Google login step and instead
 * supply an access_token that we generate using a refresh_token.
 * To get a refresh_token permissioned for the uProxy app:
 * 1. Go to this URL in your browser:
 * https://accounts.google.com/AccountChooser?service=lso&continue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fauth%3F%26response_type%3Dcode%26scope%3Demail%2Bprofile%2Bhttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgoogletalk%26access_type%3Doffline%26redirect_uri%3Dhttp%3A%2F%2Flocalhost%26approval_prompt%3Dforce%26state%3Dfreedom.oauth.redirect.handler0.10543708852492273%26client_id%3D746567772449-mv4h0e34orsf6t6kkbbht22t9otijip0.apps.googleusercontent.com%26hl%3Den%26from_login%3D1%26as%3D-589267e1881eb949&btmpl=authsub&hl=en
 * 2. After logging in and granting permission, you will be redirected to a
 * URL containing a code parameter at the end (you will see a webpage not
 * available error, but can still get the code from the URL).
 * 3. Use this code to make a POST request in curl:
 * CODE=<your_code>
 * curl --data "code=$CODE&client_id=746567772449-mv4h0e34orsf6t6kkbbht22t9otijip0.apps.googleusercontent.com&client_secret=M-EGTuFRaWLS5q_hygpJZMBu&redirect_uri=http%3A%2F%2Flocalhost&grant_type=authorization_code" https://www.googleapis.com/oauth2/v3/token
 * 4. The refresh_token return from that POST request can be used to get new
 * access_tokens
 */
var ALICE = {
  EMAIL: 'alicefreedomxmpp@gmail.com',
  NAME: 'Alice Freedom',
  REFRESH_TOKEN:
      '1/p8X36mT_Ugq4wJfC8emXFnpIMn9Ojj1zxNpmjdVq3js',
  ANONYMIZED_ID: null  // Needs to be detected through an onUserProfile event.
};
var BOB = {
  EMAIL: 'bobfreedomxmpp@gmail.com',
  NAME: 'Bob Freedom',
  REFRESH_TOKEN:
      '1/RT6ACx5aMr5Mcfa8P-uIo4dHBillQoJmEukALkbJWNw',
  ANONYMIZED_ID: null  // Needs to be detected through an onUserProfile event.
};
