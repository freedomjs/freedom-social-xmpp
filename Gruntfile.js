module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        files: {
          'node-xmpp-browser.js': ['./node_modules/node-xmpp-client/browserify.js'],
        },
        options: {
          alias : ['browser-request:request', 'lib/dns.js:dns', 'lib/net.js:net'],
          ignore : ['node-stringprep', 'faye-websocket', 'tls']
        }
      }
    }
  });

  // Load tasks.
  grunt.loadNpmTasks('grunt-browserify');

  // Default tasks.
  grunt.registerTask('compile', [
    'browserify'
  ]);
  grunt.registerTask('default', ['compile']);
};
