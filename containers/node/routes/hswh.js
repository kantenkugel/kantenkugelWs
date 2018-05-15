"use strict";

import express from 'express';

import bodyParser from 'body-parser';
import request from 'request';

const router = express.Router();

function getGameType(intRepr) {
    switch(intRepr) {
        case 1:
            return 'Duel';
        case 2:
        case 30:
            return 'Ranked';
        case 3:
            return 'Arena';
        case 4:
            return 'AI';
        case 7:
        case 31:
            return 'Casual';
        case 16:
        case 17:
        case 18:
            return 'Tavern Brawl';
        default:
            return 'Unknown';
    }
}

function getFormat(intRepr) {
    switch(intRepr) {
        case 1:
            return 'Wild';
        case 2:
            return 'Standard';
        default:
            return 'N/A';
    }
}

function normalizeString(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1, str.length).toLowerCase();
}

const hsDefaults = {
    gametype: false,    //any gametype in lowercase ("brawl" for tavern brawl)
    format: false,      //"standard" or "wild"
    result: false,      //"win" or "loss"
    small: false,       //true/false
    username: false,    //any string
    avatar: false,      //any image url
    finished: false     //true/false
};

router.get('/:id/:token', (req, res) => {
    request.get({
        uri: 'https://discordapp.com/api/webhooks/' + req.params.id + '/' + req.params.token,
        json: true
    }, (err, response, body) => {
        if(err) {
            console.log('Error fetching webhook informations', err);
            res.status(500).send('There was an error fetching the webhook informations');
        } else if(response.statusCode > 199 && response.statusCode < 300) {
            res.status(200).send('Webhook is valid. Token informations:<br/>'+JSON.stringify(body));
        } else {
            res.status(400).send('Webhook doesn\'t seem to be valid. Server responded with '+response.statusCode+':<br/>'+JSON.stringify(body));
        }
    });
});

//hsreplay webhook pipe
router.post('/:id/:token', bodyParser.json(), (req, res) => {
    let json = req.body;
    //console.log(JSON.stringify(json, null, 4));
    if(json && json.data && json.data.friendly_player) {
        json = json.data;
        const options = Object.assign({}, hsDefaults, req.query);
        const friendly = json.friendly_player;
        const opponent = json.opposing_player;
        const friendlyHero = normalizeString(friendly.hero_class_name);
        const opponentHero = normalizeString(opponent.hero_class_name);
        const game = json.global_game;
        const gameType = getGameType(game.game_type);
        const format = getFormat(game.format);

        let wins, losses, body;

        if(options.finished && options.finished.toLowerCase() === 'true') {
            wins = friendly.wins;
            losses = friendly.losses;
            if(json.won)
                wins++;
            else
                losses++;
            
            if(gameType === 'Arena' && (wins === 12 || losses === 3)) {
                body = {
                    embeds: [
                        {
                            title: friendly.name + '('+friendlyHero+') finished an Arena run ' + wins + '-' + losses + ' as ' + normalizeString(friendly.hero_class_name),
                            color: 2355041
                        }
                    ]
                };
                if(options.username) {
                    body.username = options.username;
                }
                if(options.avatar) {
                    body.avatar_url = options.avatar;
                }
        
                request.post({
                    uri: 'https://discordapp.com/api/webhooks/' + req.params.id + '/' + req.params.token,
                    json: true,
                    body: body
                }).pipe(res);
                
            } else {
                res.sendStatus(200);
            }
            
        } else if((!options.gametype || options.gametype === gameType.toLowerCase() || (options.gametype === 'brawl' && gameType === 'Tavern Brawl')) &&
            (!options.format || options.format === format.toLowerCase()) &&
            (!options.result || (options.result === 'win' && json.won) || (options.result === 'loss' && !json.won))) {
        
            let fields = [
                {
                    name: 'Game-Type',
                    value: gameType,
                    inline: true
                }
            ];
            
            if(format !== 'N/A') {
                fields.push({
                    name: 'Format',
                    value: format,
                    inline: true
                });
            }

            if(gameType === 'Arena') {
                wins = friendly.wins;
                losses = friendly.losses;
                if(json.won) {
                    wins++;
                } else {
                    losses++;
                }
                fields.push({
                    name: 'Score',
                    value: wins+'-'+losses,
                    inline: true
                });
            }
            if(gameType === 'Ranked') {
                fields.push({
                    name: 'Rank',
                    value: (friendly.legend_rank && friendly.legend_rank != null ? 'L' + friendly.legend_rank : friendly.rank),
                    inline: true
                });
            }
            
            body = {
                embeds: [
                    {
                        title: friendly.name + '('+friendlyHero+') VS ' + opponent.name + '('+opponentHero+')' + (gameType === 'Arena' ? ' - ('+wins+'-'+losses+')' : ''),
                        url: json.url,
                        color: (json.won ? 2355041 : 15556133),
                        fields: (options.small && options.small.toLowerCase() === 'true' ? [] : fields)
                    }
                ]
            };
            if(options.username)
                body.username = options.username;
            if(options.avatar)
                body.avatar_url = options.avatar;

            request.post({
                uri: 'https://discordapp.com/api/webhooks/' + req.params.id + '/' + req.params.token,
                json: true,
                body: body
            }).pipe(res);
            
        } else {
            res.sendStatus(200);
        }
    } else {
        res.sendStatus(400);
    }
});

export default router;
