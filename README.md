# PHP Static Analysis hook
PHP Static Analysis Hook configures a GIT pre-commit hook to run a few static analysis tools and block the commit if any of the tools detects code issues. 
Static analysis tools included in the current version of the hook:
* internal PHP linter (`php -l`)
* [PHP_CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer)
* [PHP Mess Detector](https://github.com/phpmd/phpmd)

Additionally, the tool symlinks hook to Composer's `bin-dir`, so that it's code can be versioned in the repository.

## Credits
The tool is an extended version of [this gist](https://gist.github.com/cjsaylor/10503398#file-pre-commit) by [cjsaylor](https://github.com/cjsaylor).
Git hook versioning is inspired by this StackOverflow answer: http://stackoverflow.com/a/3464399

## Requirements
* an initialized git repository in the project's directory
* the repository needs to have at least one commit for the script to work correctly. Yes, it is a bug - I didn't have time to cover that yet (but please go ahead and fix it).

## Usage
1. Add the package to require-dev section of your composer.json file and run `composer update`. Example:
```
{
    "require-dev": {
        "wozinski/php-static-analysis-hook": "dev-master"
    }
}

```
2. In your CLI, run `bin/symlink-git-hooks-to-hub` command. It will automatically back up your existing git hooks and will redirect all the hooks to a git-hook-hub, 
which in turn redirects the hooks' calls to the hooks in Composer's `bin-dir` (currently only pre-commit hook is in use). 

The script doesn't need any additional action - it runs whenever you run a `git commit` command.

## Ignore-errors mode
Sometimes it might be useful to commit the code even though it contains some issues. You can do that by setting an environment variable `STATIC_ANALYSIS_IGNORE_ERRORS` prior to running `git commit` command.

Please note that you should remember to unset the variable after the commit. Otherwise, all your future commits will not be blocked in case there are errors in your code.
The following command sets the variable before the commit and unsets it afterwards, feel free to use it or adjust it to your own needs:

```export STATIC_ANALYSIS_IGNORE_ERRORS="t" && git commit -a; unset STATIC_ANALYSIS_IGNORE_ERRORS```

## Disclaimer
The script in it's current version is only a proof of concept and should be used with extreme care. Use it at your own risk.
