/*jshint node:true*/
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
  "use strict";
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      grunt: [ 'Gruntfile.js' ],
      lib: [ 'lib/**/*.js', '!lib/net.js'],
      src: [ 'src/**/*.js' ],
      options: {
        jshintrc: true
      }
    },
    browserify: {
      dist: {
        files: {
          'dist/node-xmpp-browser.js': ['./node_modules/node-xmpp-client/browserify.js'],
        },
        options: {
          alias : ['browser-request:request', 'lib/dns.js:dns', 'lib/net.js:net', 'lib/stringprep.js:node-stringprep', 'lib/tlsconnect.js:tls-connect'],
          ignore : ['faye-websocket', 'tls', './websockets']
        }
      }
    },
    copy: {
      dist: {
        src: ['src/core/*'],
        dest: 'dist/',
        flatten: true, filter: 'isFile', expand: true
      },
      demo_chrome_xmpp: {
        src: [ 
          'dist/*',
          'src/demo_common/*',
          'node_modules/freedom-for-chrome/freedom-for-chrome.js',
          'src/demo_chrome_xmpp/**/*',
        ],
        dest: 'build/demo_chrome_xmpp/',
        flatten: true, filter: 'isFile', expand: true
      },
      demo_chrome_google: {
        src: [ 
          'dist/*',
          'src/demo_common/*',
          'node_modules/freedom-for-chrome/freedom-for-chrome.js',
          'src/demo_chrome_google/**/*',
        ],
        dest: 'build/demo_chrome_google/',
        flatten: true, filter: 'isFile', expand: true
      },
      demo_chrome_facebook: {
        src: [ 
          'dist/*',
          'src/demo_common/*',
          'node_modules/freedom-for-chrome/freedom-for-chrome.js',
          'src/demo_chrome_facebook/**/*',
        ],
        dest: 'build/demo_chrome_facebook/',
        flatten: true, filter: 'isFile', expand: true
      },
      demo_firefox_google: { 
        src: [ '**/*' ], 
        dest: 'build/demo_firefox_google/',
        cwd: 'src/demo_firefox_google/',
        filter: 'isFile', expand: true,
      },
      demo_firefox_google_data: {
        src: [
          'dist/*',
          'src/demo_common/**/*',
          'node_modules/freedom-for-firefox/freedom-for-firefox.jsm',
          'src/demo_chrome_google/demo.json',
        ],
        dest: 'build/demo_firefox_google/data/',
        flatten: true, filter: 'isFile', expand: true
      },
      demo_firefox_facebook: {
        src: [ '**/*' ], 
        dest: 'build/demo_firefox_facebook/',
        cwd: 'src/demo_firefox_facebook/',
        filter: 'isFile', expand: true,
      },
      demo_firefox_facebook_data: {
        src: [
          'dist/*',
          'src/demo_common/**/*',
          'node_modules/freedom-for-firefox/freedom-for-firefox.jsm',
          'src/demo_chrome_facebook/demo.json',
        ],
        dest: 'build/demo_firefox_facebook/data/',
        flatten: true, filter: 'isFile', expand: true
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
      },
      social: {
        src: FILES.jasmine_helpers.concat(
          ['dist/socialprovider.js', 'dist/vcardstore.js', 
           'dist/node-xmpp-browser.js']),
        options: {
          specs: 'spec/socialprovider.spec.js',
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
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-node');

  // Compile into build/
  grunt.registerTask('build', [
    'jshint',
    'browserify',
    'copy:dist'
  ]);

  // Build the demos
  grunt.registerTask('demos', [
    'build',
    'copy:demo_chrome_xmpp',
    'copy:demo_chrome_google',
    'copy:demo_chrome_facebook',
    'copy:demo_firefox_google',
    'copy:demo_firefox_google_data',
    'copy:demo_firefox_facebook',
    'copy:demo_firefox_facebook_data',
  ]);
  
  // Testing meta-task
  grunt.registerTask('test', [
    'build',
    'copy:jasmine',
    'jasmine',
    'jasmine_node'
  ]);

  // Default task
  grunt.registerTask('default', [ 'build' ]);
};
