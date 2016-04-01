/*
* @Author: Grzegorz Daszuta
* @Date:   2016-04-01 09:28:26
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-04-01 13:16:58
*/

'use strict';

// jshint node: true

var through = require('through2');
var fs = require('fs');
var exec = require('child_process').exec;
var util = require("util");
var gutil = require('gulp-util');
var chalk = require('chalk');

module.exports = function(options) {
    var catchFiles = [ 'php' ];
    var fileNames = [];

    if(!options.path) {
        throw "No path set in phpCsPlugin options";
    }

    return through.obj(function(file, enc, callback) {
        var stream = this;
        
        var ext = file.path.replace(/.*\./, '');

        // skip
        if(catchFiles.indexOf(ext) !== -1) {
            fileNames.push(file.path);
        }

        stream.push(file);
        callback();
        

    }, function(callback) {
        var stream = this;

        if(fileNames.length === 0) {
            gutil.log(util.format('[%s] nothing to report', chalk.cyan('phpcs')));

            callback();
            return;
        }

        var args = [
            'php',
            '/app/vendor/bin/phpcs',
            '--report=checkstyle',
            '--error-severity=1',
            '--warning-severity=1',
            '--standard=PSR2',
        ].concat(fileNames);

        // args.push(file.path);
 
        exec(args.join(' '), {
            maxBuffer: 1024 * 1024 * 16,
        }, function(error, stdout) {
            fs.writeFile(options.path, stdout, function(err) {
                if (err) {
                    stream.emit('error', new gutil.PluginError('gulp-phpcs', err));
                    callback();

                    return;
                }

                gutil.log(util.format(
                    'Your phpCs report got written to %s',
                    chalk.magenta(options.path)
                ));

                callback();
            });
        });

    });
};
