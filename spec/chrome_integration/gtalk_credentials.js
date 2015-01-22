var ALICE_EMAIL = 'alicefreedomxmpp@gmail.com';
var BOB_EMAIL = 'bobfreedomxmpp@gmail.com';

// User names (case sensitive), used to match anonymized IDs to users.
var ALICE_NAME = 'Alice Freedom';
var BOB_NAME = 'Bob Freedom';

/*
 * GTalk integration tests skip the interactive Google login step and instead
 * supply an access_token that we generate using a refresh_token.
 * To get a refresh_token permissioned for the uProxy app:
 * 1. Go to this URL in your browser:
 * https://accounts.google.com/AccountChooser?service=lso&continue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fauth%3F%26response_type%3Dcode%26scope%3Demail%2Bprofile%2Bhttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgoogletalk%26access_type%3Doffline%26redirect_uri%3Dhttps%3A%2F%2Ffmdppkkepalnkeommjadgbhiohihdhii.chromiumapp.org%2F%26approval_prompt%3Dforce%26state%3Dfreedom.oauth.redirect.handler0.10543708852492273%26client_id%3D746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com%26hl%3Den%26from_login%3D1%26as%3D-589267e1881eb949&btmpl=authsub&hl=en
 * 2. After logging in and granting permission, you will be redirected to a
 * URL containing a code parameter at the end (you will see a webpage not
 * available error, but can still get the code from the URL).
 * 3. Use this code to make a POST request in curl:
 * CODE=<your_code>
 * curl --data "code=$CODE&client_id=746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com&client_secret=h_hfPI4jvs9fgOgPweSBKnMu&redirect_uri=https%3A%2F%2Ffmdppkkepalnkeommjadgbhiohihdhii.chromiumapp.org%2F&grant_type=authorization_code" https://www.googleapis.com/oauth2/v3/token
 * 4. The refresh_token return from that POST request can be used to get new
 * access_tokens
 */
var REFRESH_TOKENS = {};
REFRESH_TOKENS[ALICE_EMAIL] =
    '1/1BQUvs6QycWFn3CnL-JnmTP6OLl_eDBaIRVf4Kgky4AMEudVrK5jSpoR30zcRFq6';
REFRESH_TOKENS[BOB_EMAIL] =
    '1/ZjOcjJskQWyR6mp8L1VpuaR72p4-qVUfJFVfqNlwBc4';
