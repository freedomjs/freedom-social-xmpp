/*globals chrome */
/*jslint sloppy:true */
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('main.html', {
    'bounds': {
      'width': 900,
      'height': 700
    }
  });
});
