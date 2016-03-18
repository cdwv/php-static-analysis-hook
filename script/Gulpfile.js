/*
* @Author: Grzegorz Daszuta
* @Date:   2016-03-18 13:31:54
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-03-18 15:27:18
*/

'use strict';

var phplint = require('gulp-phplint');
var phpcs = require('gulp-phpcs');
var phpmd = require('gulp-phpmd');
var gulp = require('gulp');
var debug = require('gulp-debug');
var jshint = require('gulp-jshint');

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
    gulp
        .src(phpLintTarget)
        .pipe(phplint())
        .pipe(phpcs({
            bin: '/app/vendor/bin/phpcs',
            standard: 'PSR2',
            warningSeverity: 0,
            showSniffCode: true,
            colors: true,
        }))
        .pipe(phpcs.reporter('log'))
        // .pipe(phpmd({
        //     bin: '/app/vendor/bin/phpmd',
        //     format: 'text',
        // }))
        // .pipe(phpmd.reporter('log'))
        ;
});

gulp.task('jslint', function() {
    gulp
        .src(jsLintTarget)
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
})

gulp.task('default', ['phplint', 'jslint']);