# Kantenkugel WS

This is the server i am currently using to host my own website.
It consists of two Docker containers and a `docker-compose.yml` file for starting it up.

The two Docker containers are:

 - A modified `nginx:alpine` container based on [github.com/agarzon/nginx-config](https://github.com/agarzon/nginx-config)
 - A Nodejs server using express to host a small API

## Licensing

The two Docker containers (in the [containers directory](/containers)) both have their own licenses, which are included in the appropriate container directory.

Everything else can be seen as public domain and has no copyright restrictions on it.

## Requirements

 - Docker
 - Docker-compose

## Running It

 1. Create some nginx site configs (see the [Nginx Container Readme](/containers/nginx/README.MD) or the [provided example sites](/sites/) for examples)
    - You should use the `/data/keys` mount point for ssl keys
    - You should use the `/data/statics` mount point for static files
    - the node api should be reachable through the `/api/` route (`proxy_pass http://nodeapi/;`)
    - Reverse-Proxy headers like `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-For` should be set for api route
 2. Make sure all ssl keys used by site configs are present in the `keys` folder
    - You can create temporary self-signed ones via the `gen_test_keys.sh` script
 3. (Optional) If you want to use the discord API route (show connections), copy `discord_application.env.template` to `discord_application.env` and populate it
    - `CLIENT_ID` and `CLIENT_SECRET` refer to your Discord Application's id and secret
    - `BOT_TOKEN` and `GUILD_IDS` are used when you want to automatically add the user to a guild. They are optional. `GUILD_IDS` should be in array-notation like `[1, 2]`
 4. Start up the servers via `docker-compose up -d --build`
    - This forces a rebuild of the images and then starts them up as daemons
    - You can also use the `start.sh` script