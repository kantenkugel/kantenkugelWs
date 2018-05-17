Info
====

This Container is heavily based on [Repo agarzon/nginx-config](https://github.com/agarzon/nginx-config) and is therefore licensed under the same MIT license.


Changes made to original repo
=============================

- Added a `spa.conf` template useful for SPA sites.
  - Should be used inside of a `location` context, as it does not redefine a `location` block like `php.conf` and `no-php.conf` do.
  - Additionally to direct uri matching and index matching, this also serves the `$uri.html` page if available (pre-rendered spa pages)
  - Uses a `$spabase` variable to serve `$spabase/200.html` just before returning the 404 page. Useful if your SPA properly handles routes not avail as html files
  - Added default `$spabase` variable to `templates/default.conf` (set to `/`)
- Removed `.gitignore` as this is part of a bigger repo and there should be no misc files in here
- Created `.dockerignore` and `Dockerfile`, which...
  - Uses nginx:alpine as base image
  - Generates dhparams via openssl
  - Creates 4 volumes
    - `/var/log/nginx` for nginx logs
    - `/etc/nginx/sites-enabled` for external site configuration
    - `/data/statics` as default way of providing static files (needs proper site config to use)
    - `/data/keys` as default way of providing ssl keys (needs proper site config to use)
  - Removes default nginx config and adds our own files
  - Exposes both ports `80` and `443`


Site config template
====================

This is an example site config, which is based on the one from the original repo, with some changes regarding docker volumes applied.

`mywebsite.conf`:

```
# Force HTTPS
server
{
    server_name     mywebsite.com;
    return          301 https://$server_name$request_uri;
}

server
{
    server_name     mywebsite.com;
    root            /data/statics/$server_name/;

    listen          443 ssl http2;
    ssl_certificate /data/keys/nginx.crt;
    ssl_certificate_key /data/keys/nginx.key;

    access_log /var/log/nginx/mywebsite.com.log combined buffer=10k flush=1m;
    error_log /var/log/nginx/mywebsite.com.error.log error;

    include templates/default.conf;
    include templates/php.conf;
    #include templates/no-php.conf;
    include templates/gzip.conf;
    include templates/static-cache.conf;
    include templates/ssl.conf;
}
```