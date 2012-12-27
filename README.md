Todo
====

A todo list manager for online/offline use in modern web browsers, based loosely on GTD principles.

Installation
------------

After cloning this repository and pointing your web server to the `html`
directory, do the following.

1. Copy `config.sample.php` into `config.php` and make sure that the default
   timezone is correct.
2. Copy `credentials.sample.json into `credentials.json`, and populate it with
   real usernames and passwords.
3. Create the directory `user` in the app root, and make it writable by the web
   server.
