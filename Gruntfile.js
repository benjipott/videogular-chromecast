module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        release: {
            options: {
                //bump: false, //default: true
                //file: 'bower.json', //default: package.json
                //add: false, //default: true
                //commit: false, //default: true
                //tag: false, //default: true
                //push: false, //default: true
                //pushTags: false, //default: true
                //npmtag: true, //default: no tag
                //folder: 'folder/to/publish/to/npm', //default project root
                //commitMessage: 'check out my release <%= version %>', //default: 'release <%= version %>'
                //tagMessage: 'tagging version <%= version %>', //default: 'Version <%= version %>',
                //tagName: 'v<%= version %>', //default: '<%= version %>'

                file: 'bower.json', //default: package.json
                add: false, //default: true
                commit: false, //default: true
                tag: false, //default: true
                push: false, //default: true
                pushTags: false, //default: true
                npm: false
            }
        },
        connect: {
            server: {
                options: {
                    open: true,
                    port: 9000,
                    hostname: 'localhost'
                }
            }
        },
        watch: {
            configFiles: {
                files: ['Gruntfile.js', '*.js'],
                options: {
                    reload: true
                }
            }
        },
        // Automatically inject Bower components into the app
        wiredep: {
            target: {
                src: './exemple/chromecast.html',
                ignorePath: '',
                exclude: []
            }
        }
    });

    grunt.loadNpmTasks('grunt-release');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-wiredep');

    grunt.registerTask('default', ['wiredep', 'connect', 'watch']);
    grunt.registerTask('major', ['release:major']);
    grunt.registerTask('minor', ['release:minor']);
    grunt.registerTask('patch', ['release:patch']);
};
