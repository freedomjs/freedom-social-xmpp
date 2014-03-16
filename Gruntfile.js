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
  grunt.registerTask('test', [
    'copy:jasmine',
    'jasmine'
  ]);
  grunt.registerTask('default', ['compile']);
};
