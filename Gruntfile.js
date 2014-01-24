module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        files: {
          'node-xmpp-browser.js': ['./node_modules/node-xmpp-client/browserify.js'],
        },
        options: {
          alias : 'browser-request:request',
          ignore : ['node-stringprep', 'faye-websocket', './srv', 'dns', 'tls']
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
