"use strict";

import Oauth from 'client-oauth2';
import request from 'request';
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const discordApiBase = 'https://discordapp.com/api/v6/'

const clientId = process.env.CLIENT_ID || '';
const clientSecret = process.env.CLIENT_SECRET || '';

const botToken = process.env.BOT_TOKEN || '';
const guildId = process.env.GUILD_ID || '';

const redirectUri = 'https://' + (process.env.HOST || 'localhost') + '/api/discord/callback';

const encKey = crypto.randomBytes(32);

const sessionsReg = {
    id: {},
    state: {}
};

const discordAuth = new Oauth({
    clientId,
    clientSecret,
    redirectUri,
    accessTokenUri: 'https://discordapp.com/api/oauth2/token',
    authorizationUri: 'https://discordapp.com/api/oauth2/authorize',
    scopes: ['identify', 'connections', 'guilds.join']
});

function encrypt(input) {
    if(input === null)
        return Promise.reject(new Error('null input is not allowed'));
    if(typeof(input) === 'object' || typeof(input) === 'array')
        input = JSON.stringify(input);
    if(typeof(input) !== 'string') {
        console.error('provided non-encryptable input to encrypt()', input);
        return Promise.reject(new Error('provided non-encryptable input to encrypt()'));
    }

    return new Promise((resolve, reject) => {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
        const buf1 = cipher.update(input, 'utf8');
        const buf2 = cipher.final();
        const buff = Buffer.concat([iv, buf1, buf2]);
        resolve(buff.toString('base64'));
    });
}

function decrypt(input) {
    if(typeof(input) !== 'string') {
        console.error('provided non-decryptable input to decrypt()', input);
        return Promise.reject(new Error('provided non-decryptable input to decrypt()'));
    }

    return new Promise((resolve, reject) => {
        const buff = Buffer.from(input, 'base64');
        const iv = buff.slice(0,16);
        const cipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
        let string = cipher.update(buff.slice(16), false, 'utf8');
        string += cipher.final('utf8');
        try {
            const tmp = JSON.parse(string);
            string = tmp;
        } catch(error) {
            //nop
        }
        resolve(string);
    });
}

function fetch(apiPath, token, fieldOverrides = {}) {
    const fields = Object.assign(
        {},
        {
            url: discordApiBase + apiPath,
            headers: {'Authorization': 'Bearer ' + token},
            json: true
        },
        fieldOverrides
    );

    return new Promise((resolve, reject) => {
        request(fields, (error, response, body) => {
            if(error)
                return reject(error);

            const code = response.statusCode;
            if(code < 200 || code > 299)
                reject(new Error('HTTP response was not ok. Code: '+code+', Body: '+body));
            else
                resolve({code, body});
        });
    });
}

function normalizeString(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1, str.length).toLowerCase();
}

function getRandomId() {
    return crypto.randomBytes(30).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

//only continue if id and secret are set
if(clientId !== '' || clientSecret !== '') {

    //cleanup old, unused sessions periodically
    setInterval(() => {
        const timeNow = Date.now();
        for(let session of Object.values(sessionsReg.id)) {
            if(Math.floor((timeNow - session.iss)/1000) > 60*5) {
                delete sessionsReg.id[session.id];
                delete sessionsReg.state[session.state];
            }
        }
    }, 60000).unref();

    //create a new session
    router.post('/session', (req, res) => {
        let id, state;
        do {
            id = getRandomId();
        } while(id in sessionsReg.id);
        do {
            state = getRandomId();
        } while(state in sessionsReg.state);

        const sessionObj = {
            id,
            state,
            iss: Date.now(),
            done: false
        };
        sessionsReg.id[id] = sessionObj;
        sessionsReg.state[state] = sessionObj;

        return res.status(200).json({
            id,
            url: discordAuth.code.getUri({state})
        });
    });

    //fetch session by id, remove from registry if done and retrieved
    router.get('/session/:id', (req, res) => {
        if(!req.params.id)
            return res.status(400).json({error: 'no id provided'});
        const obj = sessionsReg.id[req.params.id];
        if(!obj)
            return res.status(404).json({error: 'id not registered'});

        if(obj.done) {
            delete sessionsReg.id[obj.id];
            delete sessionsReg.state[obj.state];
            return res.status(200).json({
                token: obj.token,
                scopes: obj.scopes,
                error: obj.error
            });
        } else {
            return res.status(204).json({status: 'no oauth response yet'});
        }
    });

    //fetch user/connection data from discord api given token in header (respects scopes and token expiry)
    router.get('/data', (req, res) => {
        if(!req.headers.token)
            return res.status(400).json({error: 'no token'});

        decrypt(req.headers.token)
        .then(({token, expires, scopes}) => {
            if(Math.floor(Date.now()/1000) > expires)
                return res.status(400).json({error: 'token expired'});

            Promise.all([
                (scopes.includes('identify') ? fetch('users/@me', token) : false),
                (scopes.includes('connections') ? fetch('users/@me/connections', token) : false)
            ])
            .then(([{body: user}, {body: connections}]) => {
                const response = {
                    user: user || false,
                    connections: false
                };

                if(connections) {
                    response.connections = {};
                    connections
                        //.filter(conn => conn.verified)
                        //.map(conn => [normalizeString(conn.type), conn.name])
                        .forEach(conn => {
                            response.connections[normalizeString(conn.type)] = conn;
                        });
                }

                res.json(response);
            })
            .catch((error) => {
                console.error("Error fetching data from Discord api", error);
                res.status(500).json({error: 'could not fetch data from api'});
            });
        })
        .catch((error) => {
            console.error("Unable to decrypt given token");
            res.status(400).json({error: 'invalid token'});
        });
    });

    //TODO: add to guild given guild id and token
    router.put('/guilds/:id', (req, res) => {
        //todo
        /*
        if(user && scopes.includes('guilds.join') && botToken !== '' && guildId !== '')
            return fetch(`guilds/${guildId}/members/${user.id}`, false, {
                method: 'PUT',
                headers: {'Authorization': 'Bot ' + botToken},
                body: { 'access_token': token }
            });
        */
        res.sendStatus(404);
    });

    //oauth callback. render 'callback' view with message (shown) and postMessage (sent to parent window to notify of completion)
    router.get('/callback', (req, res) => {
        if(!req.query.state || req.query.error)
            return res.render('callback', {message: ':(', postMessage: req.query.error || 'nostate'});

        const sessionObj = sessionsReg.state[req.query.state];
        if(!sessionObj)
            return res.render('callback', {message: 'Invalid state!... You might have just waited too long.', postMessage: 'invalidState'});
        if(sessionObj.done)
            return res.render('callback', {message: 'Already authorized, aborting!', postMessage: 'alreadyAuthroized'});

        if(req.query.code) {
            discordAuth.code.getToken({query: req.query}) //hide pathname due to being reverse proxied
            .then((tokens) => {
                const token = tokens.accessToken;
                const expires = Math.floor(tokens.expires.getTime()/1000);
                const scopes = tokens.data.scope.split(' ');

                encrypt({
                    token,
                    expires,
                    scopes
                })
                .then((enc) => {
                    sessionObj.token = enc;
                    sessionObj.scopes = scopes;
                    sessionObj.expires = expires;
                    sessionObj.done = true;
                })
                .catch((err) => {
                    sessionObj.error = 'token encryption failed: '+err.message;
                    sessionObj.done = true;
                });
                res.render('callback', {message: 'Window can be closed now!', postMessage: 'ok'});;
            })
            .catch(err => {
                console.error(err);
                sessionObj.error = 'Error resolving oauth code: '+err.message;
                sessionObj.done = true;
                res.render('callback', {message: 'Wrong code!... You might have just waited too long.', postMessage: 'invalidCode'});;
            });
        } else {
            sessionObj.error = 'No code returned';
            sessionObj.done = true;
            return res.render('callback', {message: 'Authorization aborted. Closing window shortly', postMessage: 'noCode'});;
        }
    });
} else {
    console.log('Skipping discord oauth population due to id/secret being missing');
}

export default router;
