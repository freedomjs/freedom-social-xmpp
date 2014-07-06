var freedomPrefix = require.resolve('freedom').substr(0,
        require.resolve('freedom').lastIndexOf('freedom') + 8);

module.exports = function(grunt) {
  var distFiles = [
    'build/node-xmpp-browser.js',
    'src/*',
    'demo_common/*',
    'node_modules/freedom-for-chrome/freedom-for-chrome.js'
  ];
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        files: {
          'build/node-xmpp-browser.js': ['./node_modules/node-xmpp-client/browserify.js'],
        },
        options: {
          alias : ['browser-request:request', 'lib/dns.js:dns', 'lib/net.js:net', 'lib/stringprep.js:node-stringprep'],
          ignore : ['faye-websocket', 'tls', './websockets']
        }
      }
    },
    copy: {
      demo: {
        src: distFiles,
        dest: 'demo/xmpp/',
        flatten: true,
        filter: 'isFile',
        expand: true
      },
      demo_google: {
        src: distFiles,
        dest: 'demo_google/xmpp/',
        flatten: true,
        filter: 'isFile',
        expand: true
      },
      dist: {
        src: ['src/*'],
        dest: 'build/',
        flatten: true,
        filter: 'isFile',
        expand: true
      },
      demo_firefox_google_data: {
        src: ['demo_google/demo.json',
              'demo_common/ux.js',
              'node_modules/freedom-for-firefox/freedom-for-firefox.jsm'],
        dest: 'firefox-google-demo/data/',
        flatten: true,
        filter: 'isFile',
        expand: true
      },
      demo_firefox_google_data_xmpp: {
        src: ['src/*',
              'build/node-xmpp-browser.js',
              'demo_common/main.js'],
        dest: 'firefox-google-demo/data/xmpp/',
        flatten: true,
        filter: 'isFile',
        expand: true
      },
      jasmine: {
        src: [freedomPrefix + '/freedom.js'],
        dest: 'freedom.js'
      }
    },
    jasmine: {
      dns: {
        src: ['spec/dns_context.js', 'lib/dns.js'],
        options: {
          specs: 'spec/dns.unit.spec.js',
          keepRunner: false
        }
      }
    },
    jasmine_node: {
      integration: ['spec/integration/']
    }
  });

  // Load tasks.
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-jasmine-node');

  // Default tasks.
  grunt.registerTask('compile', [
    'browserify',
    'copy:dist'
  ]);
  grunt.registerTask('chrome_demo_login', [
    'browserify',
    'copy:demo'
  ]);
  grunt.registerTask('chrome_demo_oauth', [
    'browserify',
    'copy:demo_google'
  ]);
  grunt.registerTask('firefox_demo_oauth', [
    'browserify',
    'copy:demo_firefox_google_data',
    'copy:demo_firefox_google_data_xmpp'
  ]);
  grunt.registerTask('test', [
    'compile',
    'copy:jasmine',
    'jasmine:dns',
    'jasmine_node'
  ]);
  grunt.registerTask('default', ['compile']);
};
