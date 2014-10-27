/* global freedom*/
var social = freedom.socialprovider();

freedom.on(function(tag, msg) {
  "use strict";
  if (tag === 'relay') {
    social.on(msg, function(tag, resp) {
      freedom.emit(tag, resp);
    }.bind({}, msg));
  } else {
    social[tag].apply(social, msg).then(function(tag, resp) {
      freedom.emit(tag, resp);
    }.bind({}, tag));
  }
});
