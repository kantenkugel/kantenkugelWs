"use strict";

import express from 'express';

import hswh from './routes/hswh';
import discord from './routes/discord';

const app = express();

app.set('views', './views');
app.set('view engine', 'ejs');
app.set('trust proxy', true);

//log requests (debug only)
app.use((req, res, next) => {
    console.log(`[${req.ip}] ${req.method} => ${req.url}`);
    next();
});

app.use('/hswebhook', hswh);
app.use('/discord', discord);

//lastly, print default 404
app.use((req, res) => {
    res.sendStatus(404);
});

app.listen(80, "0.0.0.0");