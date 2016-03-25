var gutil = require('gulp-util'),
    through = require('through2'),
    chalk = require('chalk');

/**
 * Returns "log" reporter.
 *
 * The "log" reporter, according to its name, logs to the console all problems
 * that PHP Code Sniffer found.
 *
 * @returns {Function}
 */
module.exports = function() {
    return through.obj(function(file, enc, callback) {
        var report = file.phpcsReport || {};

        if (report.error) {
            // console.log(report.output);
            var output, messages;

            try {
                output = JSON.parse(report.output);
                messages = output.files[file.path].messages;
            } catch(e) {
                console.log('uninteligible blubber: ', file.path, report.output);
                messages = [];
            }
            
            messages.forEach(function(e, f) {
                var message = chalk.yellow('PHP CS') +
                    ' ' + chalk.magenta(file.path) + ': ' + e.line
                    + ': ' + e.message;
                    // report.output.replace(/\n/g, '\n    ');
                gutil.log(message);
            })
        }

        this.push(file);
        callback();
    });
};
 