/* global freedom*/
var social = freedom.socialprovider();
var page = freedom();

page.on(function(tag, msg) {
  "use strict";
  if (tag === 'relay') {
    social.on(msg, function(tag, resp) {
      freedom.emit(tag, resp);
    }.bind({}, msg));
  } else {
    console.log('!!!');
    console.log(tag);
    console.log(msg);
    social[tag].apply(social, msg).then(function(tag, resp) {
      console.log('@@@');
      console.log(resp);
      freedom.emit(tag, resp);
    }.bind({}, tag));
  }
});
