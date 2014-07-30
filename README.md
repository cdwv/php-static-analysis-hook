# PHP Static Analysis hook
PHP Static Analysis Hook configures a GIT pre-commit hook to run a few static analysis tools and block the commit if any of the tools detects code issues. It also symlinks hook to Composer's bin-dir, so that it's code can be versioned in the repository.

## Usage
1. Add the package your composer.json file and run `composer update`. 
2. In your CLI, run `bin/symlink-git-hooks-to-hub` command. It will automatically back up your existing git hooks and will redirect all the hooks to a git-hook-hub, 
which in turn redirects the hooks' calls to the hooks in Composer's `bin-dir` (currently only pre-commit hook is in use). 

Script doesn't need any additional action - it runs whenever you run a `git commit` command.

## Disclaimer
The script in it's current version is only a proof of concept and should be used with extreme care. Use it at your own risk.
