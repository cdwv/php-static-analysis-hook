# PHP Static Analysis hook
PHP Static Analysis Hook configures a GIT pre-commit hook to run a few static analysis tools and block the commit if any of the tools detects code issues. 
Static analysis tools included in the current version of the hook:
* internal PHP linter (`php -l`)
* [PHP_CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer)
* [PHP Mess Detector](https://github.com/phpmd/phpmd)

Additionally, the tool symlinks hook to Composer's `bin-dir`, so that it's code can be versioned in the repository (credits to this StackOverflow.com answer: http://stackoverflow.com/a/3464399)

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

Script doesn't need any additional action - it runs whenever you run a `git commit` command.

## Disclaimer
The script in it's current version is only a proof of concept and should be used with extreme care. Use it at your own risk.
