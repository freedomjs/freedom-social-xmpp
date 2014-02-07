window.addEventListener('load', function() {
  var form = document.getElementsByTagName('form')[0];
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var credentials = {
      userId: form.userId.value,
      password: form.password.value,
    };
    if (form.host.value) {
      credentials.host = form.host.value;
    }
    if (form.port.value) {
      credentials.port = form.port.value;
    }
    parent.postMessage(credentials, '*');
    return false;
  }, true);
  
  window.addEventListener('message', function(m) {
    document.getElementById('status').innerText = m;
  }, true);
}, true);
