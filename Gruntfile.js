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
      spec: [ 'spec/**/*.js' ],
      src: [ 'src/**/*.js' ],
      options: {
        jshintrc: true
      }
    },
    browserify: {
      dist: {
        files: {
          'dist/node-xmpp-browser-raw.js': ['./node_modules/node-xmpp-client/browserify.js'],
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
      demo_chrome_login: {
        src: [ 
          'dist/*',
          'src/demo_common/*',
          'node_modules/freedom-for-chrome/freedom-for-chrome.js',
          'src/demo_chrome_login/**/*',
        ],
        dest: 'build/demo_chrome_login/',
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
          'src/demo_common/main.js',
          'src/demo_common/ux.js',
          'node_modules/freedom-for-firefox/build/freedom-for-firefox.jsm',
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
          'src/demo_common/main.js',
          'src/demo_common/ux.js',
          'node_modules/freedom-for-firefox/build/freedom-for-firefox.jsm',
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
          specs: 'dist/socialprovider.spec.js',
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
        src: ['dist/node-xmpp-browser-raw.js'],
        dest: 'dist/node-xmpp-browser.js',
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
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-text-replace');

  // Compile into build/
  grunt.registerTask('build', [
    'jshint:grunt',
    'jshint:lib',
    'jshint:spec',
    'browserify',
    'replace',
    'copy:dist'
  ]);

  // Build the demos
  grunt.registerTask('demo_chrome_login', [
    'build',
    'copy:demo_chrome_login'
  ]);
  grunt.registerTask('demo_chrome_google', [
    'build',
    'copy:demo_chrome_google'
  ]);
  grunt.registerTask('demo_chrome_facebook', [
    'build',
    'copy:demo_chrome_facebook'
  ]);
  grunt.registerTask('demo_firefox_google', [
    'build',
    'copy:demo_firefox_google',
    'copy:demo_firefox_google_data',
  ]);
  grunt.registerTask('demo_firefox_facebook', [
    'build',
    'copy:demo_firefox_facebook',
    'copy:demo_firefox_facebook_data',
  ]);
  grunt.registerTask('build_demos', [
    'demo_chrome_login',
    'demo_chrome_google',
    'demo_chrome_facebook',
    'demo_firefox_google',
    'demo_firefox_facebook',
  ]);
  
  // Testing meta-task
  grunt.registerTask('test', [
    'build',
    'copy:jasmine',
    'jasmine:dns',
    'jasmine:social',
    'jasmine:tcp',
    'jasmine_node'
  ]);

  // Default task
  grunt.registerTask('default', [ 'build' ]);
};
