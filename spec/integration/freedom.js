var social = freedom.socialprovider();

freedom.on(function(tag, msg) {
  if (tag == 'relay') {
    social.on(tag, function(tag, resp) {
      freedom.emit(tag, resp);
    }.bind({}, tag));
  } else {
    social[tag].apply(social, msg).then(function(tag, resp) {
      freedom.emit(tag, resp);
    }.bind({}, tag));
  }
});
