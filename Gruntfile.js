var freedomPrefix = require.resolve('freedom').substr(0,
        require.resolve('freedom').lastIndexOf('freedom') + 8);

var FILES = {
  jasmine_helpers: [
    // Help Jasmine's PhantomJS understand promises.
    'node_modules/es6-promise/dist/promise-*.js',
    '!node_modules/es6-promise/dist/promise-*amd.js',
    '!node_modules/es6-promise/dist/promise-*.min.js'
  ]
};

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
          'build/node-xmpp-browser-raw.js': ['./node_modules/node-xmpp-client/browserify.js'],
        },
        options: {
          alias : ['browser-request:request', 'lib/dns.js:dns', 'lib/net.js:net', 'lib/stringprep.js:node-stringprep', 'lib/tlsconnect.js:tls-connect'],
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
              'node_modules/freedom-for-firefox/build/freedom-for-firefox.jsm'],
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
      demo_firefox_facebook_data: {
        src: ['demo_facebook/demo.json',
              'demo_common/ux.js',
              'node_modules/freedom-for-firefox/build/freedom-for-firefox.jsm'],
        dest: 'firefox-facebook-demo/data/',
        flatten: true,
        filter: 'isFile',
        expand: true
      },
      demo_firefox_facebook_data_xmpp: {
        src: ['src/*',
              'build/node-xmpp-browser.js',
              'demo_common/main.js'],
        dest: 'firefox-facebook-demo/data/xmpp/',
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
        src: FILES.jasmine_helpers.concat(
          ['spec/dns_context.js', 'lib/dns.js']),
        options: {
          specs: 'spec/dns.unit.spec.js',
          keepRunner: false
        }
      },
      tcp: {
        src: FILES.jasmine_helpers.concat(
          ['spec/tcp_context.js', 'lib/tcp.js']),
        options: {
          specs: 'spec/tcp.unit.spec.js',
          keepRunner: false
        }
      }
    },
    jasmine_node: {
      integration: ['spec/integration/']
    },
    // TODO: remove this after resolving
    // https://github.com/freedomjs/freedom-social-xmpp/issues/54
    replace: {
      facebook: {
        src: ['build/node-xmpp-browser-raw.js'],
        dest: 'build/node-xmpp-browser.js',
        replacements: [{
          from: 'XFacebookPlatform.host',
          to: 'XFacebookPlatform.prototype.host'
        }]
      }
    }
  });

  // Load tasks.
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-text-replace');

  // Default tasks.
  grunt.registerTask('compile', [
    'browserify',
    'replace',
    'copy:dist'
  ]);
  grunt.registerTask('chrome_demo_login', [
    'browserify',
    'replace',
    'copy:demo'
  ]);
  grunt.registerTask('chrome_demo_google', [
    'browserify',
    'replace',
    'copy:demo_google'
  ]);
  grunt.registerTask('firefox_demo_google', [
    'browserify',
    'replace',
    'copy:demo_firefox_google_data',
    'copy:demo_firefox_google_data_xmpp'
  ]);
  grunt.registerTask('firefox_demo_facebook', [
    'browserify',
    'replace',
    'copy:demo_firefox_facebook_data',
    'copy:demo_firefox_facebook_data_xmpp'
  ]);
  grunt.registerTask('test', [
    'compile',
    'copy:jasmine',
    'jasmine:dns',
    'jasmine_node'
  ]);
  grunt.registerTask('default', ['compile']);
};
