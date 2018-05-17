"use strict";

import Oauth from 'client-oauth2';
import request from 'request';
import express from 'express';

const router = express.Router();

const discordApiBase = 'https://discordapp.com/api/v6/'

const clientId = process.env.CLIENT_ID || '';
const clientSecret = process.env.CLIENT_SECRET || '';

const botToken = process.env.BOT_TOKEN || '';
const guildId = process.env.GUILD_ID || '';

const redirectUri = 'https://' + (process.env.HOST || 'localhost') + '/api/discord/callback';

//only continue if id and secret are set
if(clientId !== '' || clientSecret !== '') {
    
    const discordAuth = new Oauth({
        clientId,
        clientSecret,
        redirectUri,
        accessTokenUri: 'https://discordapp.com/api/oauth2/token',
        authorizationUri: 'https://discordapp.com/api/oauth2/authorize',
        scopes: ['identify', 'connections', 'guilds.join']
    });
    
    function fetch(apiPath, token, fieldOverrides = {}) {
        const fields = Object.assign({}, {
                url: discordApiBase + apiPath,
                headers: {'Authorization': 'Bearer ' + token},
                json: true
            }, fieldOverrides);
        return new Promise((resolve, reject) => {
            request(fields, (error, response, body) => {
                if(error)
                    return reject(error);

                const code = response.statusCode;
                if(code < 200 || code > 299)
                    reject({code, body});
                else
                    resolve({code, body});
            });
        });
    }
    
    function normalizeString(str) {
        return str.substring(0, 1).toUpperCase() + str.substring(1, str.length).toLowerCase();
    }
    
    router.get('/', (req, res) => {
        res.redirect(discordAuth.code.getUri());
    });
    
    router.get('/callback', (req, res) => {
        discordAuth.code.getToken({query: req.query}) //hide pathname due to being reverse proxied
        .then((tokens) => {
            const token = tokens.accessToken;

            let responseContent = '';

            Promise.all([
                fetch('users/@me', token),
                fetch('users/@me/connections', token)
            ])
            //handle user info + connections, add to guild
            .then(([{body: user}, {body: connections}]) => {
                let response = `Connections for ${user.username}#${user.discriminator} (${user.id})<br/>`;
                let connectionString = connections
                    //.filter(conn => conn.verified)
                    .map(conn => `<li>${normalizeString(conn.type)}: ${conn.name}</li>`)
                    .join('');
                connectionString = (connectionString === '') ? 'No Connections' : '<ul>'+connectionString+'</ul>';
                responseContent = response + connectionString;
                if(botToken !== '' && guildId !== '')
                    return fetch(`guilds/${guildId}/members/${user.id}`, false, {
                        method: 'PUT',
                        headers: {'Authorization': 'Bot ' + botToken},
                        body: { 'access_token': token }
                    });
                else
                    return false;
            })
            //handle response of guild add and write out everything
            .then((addResponse) => {
                if(addResponse === false) //handle addition not being enabled
                    return res.send(responseContent);

                if(addResponse.code === 204)
                    res.send(responseContent + "<br/>And you are already in the JDA Guild :)");
                else
                    res.send(responseContent + "<br/>Oh btw: You are now a proud member of the JDA Fanclub (JDA Guild)");
            })
            .catch(err => {
                console.error(err);
                if(responseContent !== '')
                    res.send(responseContent);
                else
                    res.status(500).end("There was an error fetching your data!");
            })
        });
    });
} else {
    console.log("Skipping discord oauth population due to id/secret being missing");
}

export default router;
