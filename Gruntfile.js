var FILES = require('freedom/Gruntfile.js').FILES;
for (var key in FILES) {
  FILES[key] = FILES[key].map(function(str) {
    if (str[0] === '!') {
      return '!node_modules/freedom/' + str.substr(1);
    } else {
      return 'node_modules/freedom/' + str;
    }
  });
};

module.exports = function(grunt) {
  var distFiles = [
    'build/node-xmpp-browser.js',
    'src/*'
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
          ignore : ['faye-websocket', 'tls']
        }
      }
    },
    download: {
      demojs: {
        url: "http://freedomjs.org/release/freedom-chrome/freedom.v0.1.2.js",
        filename: "demo/"
      },
      demoscript: {
        url: "http://freedomjs.org/demo/v0.4/demo/chat/main.js",
        filename: "demo/"
      },
      demoux: {
        url: "http://freedomjs.org/demo/v0.4/demo/chat/ux.js",
        filename: "demo/"
      },
      democss: {
        url: "http://freedomjs.org/demo/v0.4/demo/style.css",
        filename: "demo/"
      },
      google_demojs: {
        url: "http://freedomjs.org/release/freedom-chrome/freedom.v0.1.2.js",
        filename: "demo_google/"
      },
      google_demoux: {
        url: "http://freedomjs.org/demo/v0.4/demo/chat/ux.js",
        filename: "demo_google/"
      },
      google_democss: {
        url: "http://freedomjs.org/demo/v0.4/demo/style.css",
        filename: "demo_google/"
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
      jasmine: {
        src: ['node_modules/freedom/freedom.js'],
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
      },
      freedomIntegration: {
        src: FILES.src.concat(FILES.srcprovider).concat(FILES.jasminehelper).concat(['spec/helper.js']),
        options: {
          specs: 'node_modules/freedom/spec/providers/social/**/*.integration.spec.js',
          keepRunner: false
        }
      }
    }
  });

  // Load tasks.
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-download');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jasmine');

  // Default tasks.
  grunt.registerTask('compile', [
    'browserify',
    'copy:dist'
  ]);
  grunt.registerTask('demo', [
    'download',
    'copy:demo'
  ]);
  grunt.registerTask('demo_google', [
    'download',
    'copy:demo_google'
  ]);
  grunt.registerTask('test', [
    'copy:jasmine',
    'jasmine:dns'
  ]);
  grunt.registerTask('default', ['compile']);
};
