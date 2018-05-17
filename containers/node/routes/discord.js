"use strict";

import Oauth from 'client-oauth2';
import request from 'request';
import express from 'express';

const router = express.Router();

const discordApiBase = 'https://discordapp.com/api/v6/'

const clientId = process.env.CLIENT_ID || '';
const clientSecret = process.env.CLIENT_SECRET || '';
const redirectUri = 'https://' + (process.env.HOST || 'localhost') + '/api/discord/callback';

//only continue if id and secret are set
if(clientId !== '' || clientSecret !== '') {
    
    const discordAuth = new Oauth({
        clientId,
        clientSecret,
        redirectUri,
        accessTokenUri: 'https://discordapp.com/api/oauth2/token',
        authorizationUri: 'https://discordapp.com/api/oauth2/authorize',
        scopes: ['identify', 'connections']
    });
    
    function fetch(apiPath, token) {
        return new Promise((resolve, reject) => {
            request({
                url: discordApiBase + apiPath,
                headers: {'Authorization': 'Bearer ' + token},
                json: true
            }, (error, response, body) => {
                if(error)
                    reject(error);
                else
                    resolve(body);
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
            Promise.all([
                fetch('users/@me', tokens.accessToken),
                fetch('users/@me/connections', tokens.accessToken)
            ]).then(([user, connections]) => {
                let response = `Connections for ${user.username}#${user.discriminator} (${user.id})<br/>`;
                let connectionString = connections
                    //.filter(conn => conn.verified)
                    .map(conn => `<li>${normalizeString(conn.type)}: ${conn.name}</li>`)
                    .join('');
                connectionString = (connectionString === '') ? 'No Connections' : '<ul>'+connectionString+'</ul>';
                res.status(200).send(response + connectionString);
            }).catch(err => {
                console.error(err);
                res.status(500).send("There was an error fetching your data!");
            });
        });
    });
} else {
    console.log("Skipping discord oauth population due to id/secret being missing");
}

export default router;
