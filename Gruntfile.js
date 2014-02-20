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
        url: "https://homes.cs.washington.edu/~wrs/freedom.js",
        filename: "demo/"
      },
      demoscript: {
        url: "https://homes.cs.washington.edu/~wrs/demo/chat/main.js",
        filename: "demo/"
      },
      demoux: {
        url: "https://homes.cs.washington.edu/~wrs/demo/chat/ux.js",
        filename: "demo/"
      },
      democss: {
        url: "https://homes.cs.washington.edu/~wrs/demo/style.css",
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
