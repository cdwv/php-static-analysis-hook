/*
* @Author: Grzegorz Daszuta
* @Date:   2016-04-01 13:38:10
* @Last Modified by:   Grzegorz Daszuta
* @Last Modified time: 2016-04-01 13:50:43
*/

'use strict';

// jshint node: true

var through = require('through2');
var util = require("util");
var gutil = require('gulp-util');
var fs = require('fs');
var libxml = require("libxmljs");
var chalk = require('chalk');


var sourceFromPath = function(path) {
    var m = path.match(/report-(.*?)\.([^\.]+).xml/);

    if(m && m[1]) {
        return m[1];
    }
};

var parseCheckstyleReport = function(filePath, xmlReport) {
    var reportContents = [];
    var criticalErrors = [];

    var source = sourceFromPath(filePath);

    xmlReport.find('//file').forEach(function(fileNode){
        if(fileNode.find('error').length === 0) {
            return;
        }

        fileNode.find('error').forEach(function(errorNode) {
            var severity = errorNode.attr('severity') ? errorNode.attr('severity').value() : null;
            var severityColor;

            switch(severity) {
                case 'warning':
                    severityColor = chalk.yellow;
                    break;
                case 'error':
                    severityColor = chalk.red;
                    break;
                default:
                    severityColor = chalk.green;
            }

            var formatedError = util.format("[%s] %s%s%s %s",
                severityColor(severity),
                fileNode.attr('name') ? chalk.cyan(util.format("%s:", fileNode.attr('name').value())) : "",
                errorNode.attr('line') ? chalk.magenta(util.format("%s:", errorNode.attr('line').value())) : "",
                errorNode.attr('column') ? chalk.magenta(util.format("%s:", errorNode.attr('column').value())) : "",
                errorNode.attr('message') ? util.format("%s", errorNode.attr('message').value()) : ""
                );

            reportContents.push(formatedError);

            if(errorNode.attr('critical') && errorNode.attr('critical').value()) {
                criticalErrors.push(util.format("[%s] %s", chalk.cyan(source), formatedError));
            }
        });
    });

    var summaryLine = util.format("[%s] [%s] %s error(s), %s critical error(s)", chalk.cyan(source), chalk.cyan("summary"), chalk.red(reportContents.length), chalk.red(criticalErrors.length));

    return {
        source: source,
        contents: reportContents,
        summary: {
            errors: reportContents.length,
            criticalErrors: criticalErrors,
            contents: summaryLine,
        }
    };
};

var parsePMDReport = function(filePath, xmlReport) {
    var reportContents = [];
    var criticalErrors = [];
    var source = sourceFromPath(filePath);

    xmlReport
        .find('//file')
        .forEach(function(fileNode) {
            fileNode.find('violation').forEach(function(errorNode) {
                var severityColor = errorNode.attr('priority').value() < 3 ? chalk.red : chalk.yellow;
                var severity = 'violation';

                var formatedError = util.format("[%s] %s%s%s %s (priority %s)",
                    severityColor(severity),
                    fileNode.attr('name') ? chalk.cyan(util.format("%s:", fileNode.attr('name').value())) : "",
                    errorNode.attr('beginline') ? chalk.magenta(util.format("%s:", errorNode.attr('beginline').value())) : "",
                    errorNode.attr('column') ? chalk.magenta(util.format("%s:", errorNode.attr('column').value())) : "",
                    errorNode.text() ? util.format("%s", errorNode.text().trim()) : "",
                    chalk.magenta(errorNode.attr('priority').value())
                    );

                reportContents.push(formatedError);

            });
        });
    
    xmlReport
        .find('//error')
        .forEach(function(errorNode) {
                var severityColor = chalk.red;
                var severity = 'error';

                var formatedError = util.format("[%s] %s %s",
                    severityColor(severity),
                    errorNode.attr('filename') ? chalk.cyan(util.format("%s:", errorNode.attr('filename').value())) : "",
                    errorNode.attr('msg').value() ? util.format("%s", errorNode.attr('msg').value().trim()) : ""
                    );

                reportContents.push(formatedError);
                criticalErrors.push(util.format("[%s] %s", chalk.cyan(source), formatedError));

        });

    var summaryLine = util.format("[%s] [%s] %s error(s), %s critical error(s)", chalk.cyan(source), chalk.cyan("summary"), chalk.red(reportContents.length), chalk.red(criticalErrors.length));

    return {
        source: source,
        contents: reportContents,
        summary: {
            errors: reportContents.length,
            criticalErrors: criticalErrors,
            contents: summaryLine,
        }
    };
};

var printParsedReport = function(parsedReportContents) {
    parsedReportContents.contents.forEach(function(error) {
        gutil.log("[%s] %s", chalk.cyan(parsedReportContents.source), error);
    });
};

var printSummaryReport = function(parsedReportsSummary) {
    var criticalErrors = [];
    var summaries = [];
    var errors = 0;

    parsedReportsSummary.forEach(function(summary) {
        criticalErrors = criticalErrors.concat(summary.criticalErrors);
        errors += summary.errors;
        summaries.push(summary.contents);
    });

    summaries.forEach(function(summaryLine){
        gutil.log(summaryLine);
    });

    gutil.log(util.format("[%s] [%s] %s error(s), %s critical error(s)", chalk.cyan("all"), chalk.cyan("summary"), chalk.red(errors), chalk.red(criticalErrors.length)));
    
    if(criticalErrors.length) {
        gutil.log('');

        gutil.log(util.format("[%s] [%s] %s %s %s", 
             chalk.cyan("all"), 
            chalk.cyan("summary"), 
            chalk.red("Found"),
            chalk.magenta(criticalErrors.length),
            chalk.red("critical error(s) in repository. Breaking build.")));
        
        criticalErrors.forEach(function(criticalError) {
            gutil.log("[%s] %s", chalk.red("critical"), criticalError);
        });

        process.exit(254);
    }
};

module.exports = function() {
    var summary = [];

    return through.obj(function(file, enc, callback) {
        var stream = this;

            fs.readFile(file.path, function (err, contents) {

            if(err) {
                throw err;
            }

            var 
                xmlReport = libxml.parseXmlString(contents),
                format = xmlReport.root().name(),
                parsedReport
            ;

            if(format === 'checkstyle') {
                parsedReport = parseCheckstyleReport(file.path, xmlReport);
            }

            if(format === 'pmd') {
                parsedReport = parsePMDReport(file.path, xmlReport);
            }

            if(!parsedReport) {
                throw "Unsupported report format " + format;
            }

            printParsedReport(parsedReport);

            summary.push(parsedReport.summary);

            stream.push(file);
            callback();
        });

    }, function(callback) {
        printSummaryReport(summary);

        callback();
    });
};
