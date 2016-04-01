/*
* @Author: Grzegorz Daszuta
* @Date:   2016-04-01 09:28:28
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-04-01 13:18:56
*/

'use strict';

// jshint node: true

var exec = require('child_process').exec;
var through = require('through2');
var fs = require('fs');
var libxml = require("libxmljs");
var util = require("util");
var gutil = require('gulp-util');
var chalk = require('chalk');

module.exports = function(options) {
    var catchFiles = [ 'php' ];

    if(!options.path) {
        throw "No path set in phpCsPlugin options";
    }

    var report = [];

    return through.obj(function(file, enc, callback) {
        var stream = this;

        var ext = file.path.replace(/.*\./, '');

        // skip
        if(catchFiles.indexOf(ext) === -1) {
            stream.push(file);
            callback();
            return;
        }
        
        var args = [
            'php',
            '-d', 'display_errors=1',
            '-l',
            file.path,
        ];

        args.push(file.path);
 
        exec(args.join(' '), {}, function(error, stdout) {
            report.push({
                path: file.path,
                message: stdout,
            });

            stream.push(file);
            callback();
        });
    }, function(callback) {
        var stream = this;
        
        // merge report
            if(report.length === 0) {
                gutil.log(util.format('[%s] nothing to report', chalk.cyan('phplint')));

                callback();
                return;
            }

            var xmlReport = libxml.Document();
            var checkStyle = xmlReport
                .node('checkstyle');

            report.forEach(function(reportLine) {
                var fileNode = checkStyle
                    .node('file').attr({ name: reportLine.path });

                if(! /^No syntax errors detected in/.test(reportLine.message)) {
                    var message = reportLine.message
                        .replace('Errors parsing ' + reportLine.path, '')
                        .trim();
                    var m = reportLine.message.match(/on line (\d+)/);
                    var line;

                    if(m) {
                        line = m[1];
                    }

                fileNode
                    .node('error').attr({ 
                        message: message, 
                        line: line,
                        source: 'Php.Lint',
                        severity: 'error',
                        critical: true 
                    });
                }
            });


        fs.writeFile(options.path, xmlReport.toString(), function(err) {
            if (err) {
                stream.emit('error', new gutil.PluginError('gulp-phplint', err));

                callback();

                return;
            }

            gutil.log(util.format(
                'Your phpLint report got written to %s',
                chalk.magenta(options.path)
            ));

            callback();
        });
    });
};