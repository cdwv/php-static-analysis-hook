/*
* @Author: Grzegorz Daszuta
* @Date:   2016-03-18 13:31:54
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-03-30 08:45:48
*/

'use strict';

var gulp = require('gulp');
var debug = require('gulp-debug');
var seq = require('run-sequence');
var git = require('gulp-git');
var argv = require('minimist')(process.argv.slice(2));
var exec = require('child_process').exec;
var through = require('through2');
var fs = require('fs');
var libxml = require("libxmljs");
var util = require("util");
var gutil = require('gulp-util');
var chalk = require('chalk');

var targetFiles = {
    php: [],
    js: [],
};

gulp.task('getPhpFiles', function(done) {
    git.exec({
        'args': 'ls-files -comvizx \'*.php\'',
        'cwd': '/target',
        'maxBuffer': 1024 * 50000
    }, function(err, stdout) {
        if (err) throw err;

        targetFiles.php = stdout
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
                return (argv.all ? 'HC' : 'C').indexOf(i.status) !== -1
            })
            .map(function(i) {
                return i.filename;
            });

        done();
    });
});

gulp.task('getJsFiles', function(done) {
    git.exec({
        'args': 'ls-files -comvizx \'*.js\'',
        'cwd': '/target',
        'maxBuffer': 1024 * 50000
    }, function(err, stdout) {
        if (err) throw err;

        targetFiles.js = stdout
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
                return (argv.all ? 'HC' : 'C').indexOf(i.status) !== -1
            })
            .map(function(i) {
                return i.filename;
            });
        done();
    });
});

gulp.task('getFiles', function(done) {
    seq('getPhpFiles', 'getJsFiles', done);
});

var lintPlugin = function(options) {
    return through.obj(function(file, enc, callback) {
        var stream = this;

        this.push(file);
        callback();
    });
}

var phpMdPlugin = function(options) {
    return through.obj(function(file, enc, callback) {
        var stream = this;

        var args = [
            ' ',
            '/app/vendor/bin/phpmd',
            file.path,
            'xml',
            '/app/phpmd/symfony-variables.xml',
        ];

        args.push(file.path);
 
        exec(args.join(' '), {}, function(error, stdout, stderr) {
            file.reports = file.reports || {};
            file.reports.phpmd = {path: file.path, message: stdout};

            stream.push(file);

            callback();
        });
    });
}

var phpCsPlugin = function(options) {
    return through.obj(function(file, enc, callback) {
        var stream = this;

        var args = [
            'php',
            '/app/vendor/bin/phpcs',
            '--report=checkstyle',
            '--error-severity=1',
            '--warning-severity=1',
            '--standard=PSR2',
        ];

        args.push(file.path);
 
        exec(args.join(' '), {}, function(error, stdout, stderr) {
            file.reports = file.reports || {};
            file.reports.phpcs = {message: stdout, path: file.path};

            stream.push(file);

            callback();
        });
    });
}

var phpLintPlugin = function(options) {
    return through.obj(function(file, enc, callback) {
        var stream = this;

        var args = [
            'php',
            '-d', 'display_errors=1',
            '-l'
        ];

        args.push(file.path);
 
        exec(args.join(' '), {}, function(error, stdout, stderr) {
            file.reports = file.reports || {};
            file.reports.phplint = { path: file.path, message: stdout};

            stream.push(file);

            callback();
        });
    });
}

var jsHintPlugin = function(options) {
    return through.obj(function(file, enc, callback) {
        var stream = this;

        var args = [
            'jshint',
            '--reporter=checkstyle',
        ];

        args.push(file.path);
 
        exec(args.join(' '), {}, function(error, stdout, stderr) {
            file.reports = file.reports || {};
            file.reports.jshint = { path: file.path, message: stdout};

            stream.push(file);

            callback();
        });
    });
}

var convertReport = function(engine, report)
{
    switch(engine)
    {
        // Checkstyle-complaint reporters
        case 'phpcs':
        case 'jshint':
            try {
                xmlReport = libxml.parseXmlString(report.message);
            } catch(e) {
                throw "Error " + e + " in " + JSON.stringify(report.message);
            }
            return xmlReport;
            
        case 'phpmd':
                var pmdXmlReport = libxml.parseXmlString(report.message);
                var xmlReport = libxml.Document();
                var fileName;

                if(pmdXmlReport.get('//file')) {
                    fileName = pmdXmlReport.get('//file').attr('name').value();
                } else if(pmdXmlReport.get('//error')) {
                    fileName = pmdXmlReport.get('//error').attr('filename').value();
                }
                
                var cs = xmlReport
                    .node('checkstyle')
                    .node('file').attr({name: fileName});

                
                if(pmdXmlReport.get('//file')) {
                    var violations = pmdXmlReport.find('//violation');

                    violations.forEach(function(node) {
                        cs.node('error').attr({
                            message: node.text().trim(),
                            line: node.beginline,
                            source: node.attr('ruleset').value().replace(/\s/,'') + '.' + node.attr('rule').value(),
                            severity: 'warning',
                            package: node.attr('package') ? node.attr('package').value() : null,
                            class: node.attr('class') ? node.attr('class').value() : null,
                            method: node.attr('method') ? node.attr('method').value() : null,
                            priority: node.attr('priority') ? node.attr('priority').value() : null,
                        })
                    })

                } else if(pmdXmlReport.get('//error')) {
                    var error = pmdXmlReport.get('//error');
                    var message = error.attr('msg').value();
                    var m = message.match(/line: (\d+), col: (\d+)/)
                    if(m) {
                        var line = m[1];
                        var col = m[2];
                    }

                    cs.node('error').attr({
                        message: error.attr('msg').value(),
                        line: line,
                        column: col,
                        severity: 'error',
                        source: 'Php.PhpMd',

                    });

                    fileName = pmdXmlReport.get('//error').attr('filename').value();
                }
            return xmlReport;
            
        case 'phplint':
            var xmlReport = libxml.Document();

            var checkStyle = xmlReport
                .node('checkstyle');
            
            if(! /^No syntax errors detected in/.test(report.message)) {
                var message = report.message
                    .replace('Errors parsing ' + report.path, '')
                    .trim();
                var m = report.message.match(/on line (\d+)/);
                var line;

                if(m) {
                    line = m[1];
                }

            checkStyle
                .node('file').attr({ name: report.path })
                .node('error').attr({ message: message, line: line, source: 'Php.Lint', severity: 'error' });
            }

            return xmlReport;
    }
}

var combineReports = function(options) {
    var allReports = {};

    return through.obj(function(file, enc, callback) {
        if(file.reports) {
            allReports[file.path] = file.reports;
        }

        this.push(file);
        
        callback();

    }, function(callback) {
        var combinedReport = libxml.Document().node('checkstyle');

        var filePath;

        for(filePath in allReports) {
            var fileReport = allReports[filePath];

            var engine;

            for(engine in fileReport) {
                var file = combinedReport.node('file').attr({name: filePath});
                var checkstyleReport = convertReport(engine, fileReport[engine]);

                checkstyleReport.find('//error').forEach(function(node) {
                    node.attr({'engine': engine});
                    file.addChild(node);
                });
            }
        };
            fs.writeFile(options.path, combinedReport.toString(), function(err) {
                if (err) {
                    stream.emit('error', new gutil.PluginError('gulp-phpcs', err));
                    callback();

                    return;
                }

                // Build console info message
                var message = util.format(
                    'Your report got written to %s',
                    chalk.magenta(options.path)
                );

                // And output it.
                gutil.log(message);

                callback();
            });
    });
}

gulp.task('showPhpFiles', function() {
    return gulp
        .src(targetFiles.php, {cwd: '/target/'})
        .pipe(debug({ title: 'php' }))
        .pipe(phpCsPlugin())
        .pipe(phpMdPlugin())
        .pipe(phpLintPlugin())
        .pipe(combineReports({
            path: '/output/report-php.xml',
        }))
        ;
});

gulp.task('showJsFiles', function() {
    return gulp
        .src(targetFiles.js, {cwd: '/target/'})
        .pipe(debug({ title: 'js' }))
        .pipe(jsHintPlugin())
        .pipe(combineReports({
            path: '/output/report-js.xml',
        }))
        ;
});

gulp.task('showFiles', function(done) {
    seq(['showPhpFiles', 'showJsFiles'], done);
});

gulp.task('default', function(done) {
    seq('getFiles', 'showFiles', ['phplint', 'phpcs', 'phpmd', 'jshint'], 'printReport', done);
});

gulp.task('phplint', function(done) {
    console.log('stub');
    done();
});

gulp.task('phpcs', function(done) {
    console.log('stub');
    done();
});

gulp.task('phpmd', function(done) {
    console.log('stub');
    done();
});

gulp.task('jshint', function(done) {
    console.log('stub');
    done();
});

gulp.task('printReport', function(done) {
    console.log('stub');
    done();
});
