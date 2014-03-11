module.exports = function(grunt) {
  var distFiles = [
    'node-xmpp-browser.js',
    'src/*'
  ];
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        files: {
          'node-xmpp-browser.js': ['./node_modules/node-xmpp-client/browserify.js'],
        },
        options: {
          alias : ['browser-request:request', 'lib/dns.js:dns', 'lib/net.js:net', 'lib/stringprep.js:node-stringprep'],
          ignore : ['faye-websocket', 'tls']
        }
      }
    },
    download: {
      demojs: {
        url: "http://freedomjs.github.io/release/freedom-chrome/freedom.v0.1.1.js",
        filename: "demo/"
      },
      demoscript: {
        url: "http://freedomjs.github.io/demo/v0.4/demo/chat/main.js",
        filename: "demo/"
      },
      demoux: {
        url: "http://freedomjs.github.io/demo/v0.4/demo/chat/ux.js",
        filename: "demo/"
      },
      democss: {
        url: "http://freedomjs.github.io/demo/v0.4/demo/style.css",
        filename: "demo/"
      }
    },
    copy: {
      demo: {
        src: distFiles,
        dest: 'demo/xmpp/',
        flatten: true,
        filter: 'isFile',
        expand: true
      }
    }
  });

  // Load tasks.
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-download');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // Default tasks.
  grunt.registerTask('compile', [
    'browserify'
  ]);
  grunt.registerTask('demo', [
    'download',
    'copy:demo'
  ]);
  grunt.registerTask('default', ['compile']);
};
