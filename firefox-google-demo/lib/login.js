/**
 * @fileoverview Description of this file.
 */

var CLIENT_ID =
  "222861774905-u4e5lp293k0hm2cbmr9iil4jk3os7i3b.apps.googleusercontent.com";
var CLIENT_SECRET = "SB-6TREbiMAM9b8Mnwhizo1p";

var REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

self.port.on("getToken", function(authorization_code) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "https://accounts.google.com/o/oauth2/token", false);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  var params = "code=" + authorization_code +
               "&client_id=" + CLIENT_ID +
               "&client_secret=" + CLIENT_SECRET +
               "&redirect_uri=" + REDIRECT_URI +
               "&grant_type=authorization_code";
  xhr.onload = function() {
    var resp = JSON.parse(xhr.response);
    getUserInfo(resp.access_token);
  }
  xhr.send(params);
});

function getUserInfo(token) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://www.googleapis.com/oauth2/v1/userinfo?alt=json", false);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.onload = function() {
    var response = JSON.parse(xhr.response);
    var credentials = {
      userId: response.email,
      jid: response.email,
      oauth2_token: token,
      oauth2_auth: 'http://www.google.com/talk/protocol/auth',
      host: 'talk.google.com'
    };
    self.port.emit("receiveCredentials", credentials);
  }
  xhr.send();
}
