/*
* @Author: Grzegorz Daszuta
* @Date:   2016-03-18 13:31:54
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-04-08 09:54:38
*/

// jshint node: true

'use strict';

var gulp = require('gulp');
var seq = require('run-sequence');
var git = require('gulp-git');
var argv = require('minimist')(process.argv.slice(2));

var phpMdPlugin = require('./plugins/phpmd.js');
var phpCsPlugin = require('./plugins/phpcs.js');
var phpLintPlugin = require('./plugins/phplint.js');
var jsHintPlugin = require('./plugins/jshint.js');
var printReports = require('./plugins/printReports.js');

var targetFiles = [];

var mm = require('micromatch');

var fileTypes = [
    'php',
    'js',
    'css',
    'scss',
];

var matchFiles = [
    '**/*'
];

if(argv['ignore-symfony']) {
    matchFiles = matchFiles.concat([
        '!{var,app}/App{Cache,Kernel}.php',
        '!app/autoload.php',
        '!var/SymfonyRequirements.php',
        '!web/{app,app_dev,config}.php'
    ]);
}

gulp.task('getFiles', function(done) {
    git.exec({
        'args': 'ls-files -comvz',
        'cwd': '/target',
        'maxBuffer': 1024 * 50000
    }, function(err, stdout) {
        if (err) {
            throw err;
        }

        stdout
            .split(/\0/)
            .map(function(i) {
                var m = i.match(/(.)\s(.+)/);

                if(m) {
                    return {
                        'status': m[1],
                        'filename': m[2],
                    };
                }
            })
            .filter(function (i) {
                return i && i.filename;
            })
            .filter(function (i) {
                return (argv.all ? 'HC' : 'C').indexOf(i.status) !== -1;
            })
            .filter(function(i) {
                var ext = i.filename.replace(/.*\./, '');
                return fileTypes.indexOf(ext) !== -1;
            })
            .map(function(i) {
                return i.filename;
            }).forEach(function(i) {
                targetFiles.push(i);
            });


        done();
    });
});

gulp.task('prepareReport', function() {
    return gulp
        .src(mm(targetFiles, matchFiles), {cwd: '/target/'})
        .pipe(phpLintPlugin({
            path: '/output/report-phplint.checkstyle.xml',
        }))
        .pipe(phpCsPlugin({
            path: '/output/report-phpcs.checkstyle.xml',
        }))
        .pipe(phpMdPlugin({
            path: '/output/report-phpmd.pmd.xml',
        }))
        .pipe(jsHintPlugin({
            path: '/output/report-jshint.checkstyle.xml',
        }))
        ;
});

gulp.task('default', function(done) {
    seq('getFiles', 'prepareReport', 'printReport', done);
});

gulp.task('printReport', function() {
    return gulp
        .src('/output/**/report-*.*.xml')
        .pipe(printReports());
});
