/*
* @Author: Grzegorz Daszuta
* @Date:   2016-03-18 13:31:54
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-03-21 16:37:06
*/

'use strict';

var phplint = require('gulp-phplint');
var phpcs = require('gulp-phpcs');
var phpmd = require('gulp-phpmd');
var gulp = require('gulp');
var debug = require('gulp-debug');
var jshint = require('gulp-jshint');
var seq = require('run-sequence');
var jsonreporter = require('./json.js');
var map = require('map-stream');
var gutil = require('gulp-util');
var chalk = require('chalk');
var git = require('gulp-git');

var phpLintTarget = [
    '/target/**/*.php',
    '!/**/{node_modules,bower_components,vendor,web,www}/**/*.*', 
    '!/target/{app,var}/cache/**/*.*'
];

var jsLintTarget = [
    '/target/**/*.js',
    '!/**/{node_modules,bower_components,vendor,web,www}/**/*.*'
];

gulp.task('phplint', function() {
    return gulp
        .src(phpLintTarget)
        // .pipe(debug())
        .pipe(phplint('', {
            skipPassedFiles: true,
        }))
        .pipe(phplint.reporter('default'))
        .on('done', function() {
            console.log('done2')
        })
        // .on('end', function() {
        //     console.log('done')
        // })
        // .on('error', function(error) {
        //     console.log('error', error);
        //     done(error);
        // })
        // .done(function() {console.log('ddd')})
        ;
});

gulp.task('phpcs', function(done) {
    return gulp
        .src(phpLintTarget)
        .pipe(phpcs({
            bin: '/app/vendor/bin/phpcs',
            standard: 'PSR2',
            warningSeverity: 0,
            showSniffCode: true,
            colors: true,
            report: 'json',
        }))
        .pipe(jsonreporter());
});

gulp.task('phpmd', function(done) {
        gulp
        .src(phpLintTarget)
        .pipe(phpmd({
            bin: '/app/vendor/bin/phpmd',
            format: 'text',
        }))
        .pipe(phpmd.reporter('log'));
});

gulp.task('php', function(done) {
    seq('phplint', 'phpcs', done);
});

var myReporter = map(function (file, cb) {
  if (!file.jshint.success) {
    file.jshint.results.forEach(function (res) {

      if (res.error) {
        var message = chalk.yellow('JSHINT') +
            ' ' + chalk.magenta(file.path) + ': ' + res.error.line
            + ': ' + res.error.reason;
        gutil.log(message);
      }
    });
  }
  cb(null, file);
});

gulp.task('jslint', function() {
    return gulp
        .src(jsLintTarget)
        .pipe(jshint())
        .pipe(myReporter);
});

gulp.task('default', function(done) {
    seq('php', 'jslint', done)
});

gulp.task('git', function() {
    git.status({cwd: '/target', 'args': '--porcelain'}, function (err, stdout) {
        console.log(stdout)
    });
})