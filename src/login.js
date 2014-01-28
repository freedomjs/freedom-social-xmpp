window.addEventListener('load', function() {
  var form = document.getElementsByTagName('form')[0];
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    parent.postMessage({
      jid: form.un.value,
      cred: form.pw.value,
      host: form.sv.value
    }, '*');
    return false;
  }, true);
}, true);
