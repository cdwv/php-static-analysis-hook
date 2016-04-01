/*
* @Author: Grzegorz Daszuta
* @Date:   2016-04-01 09:28:24
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-04-01 13:19:07
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
    if(!options.path) {
        throw "No path set in phpMdPlugin options";
    }

    var catchFiles = ['php'];
    var fileNames = [];

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

        if(fileNames.length === 0) {
            gutil.log(util.format('[%s] nothing to report', chalk.cyan('phpmd')));

            callback();
            return;
        }

        var stream = this;

        var args = [
            ' ',
            '/app/vendor/bin/phpmd',
            fileNames.join(','),
            'xml',
            '/app/phpmd/symfony-variables.xml',
        ];

        exec(args.join(' '), {
            maxBuffer: 1024 * 1024 * 16,
        }, function(error, stdout) {
            fs.writeFile(options.path, stdout, function(err) {
                if (err) {
                    stream.emit('error', new gutil.PluginError('gulp-phpmd', err));
                    callback();

                    return;
                }

                gutil.log(util.format(
                    'Your phpMd report got written to %s',
                    chalk.magenta(options.path)
                ));

                callback();
            });
        });
    });
};
