window.addEventListener('load', function() {
  var form = document.getElementsByTagName('form')[0];
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    parent.postMessage({
      un: form.un.value,
      pw: form.pw.value,
    }, '*');
    return false;
  }, true);
}, true);
