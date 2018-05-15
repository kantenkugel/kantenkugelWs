"use strict";

import express from 'express';

import hswh from './routes/hswh';

const app = express();

//log requests (debug only)
app.use((req, res, next) => {
    console.log(req.method+' => '+req.url);
    next();
});

app.use('/hswebhook', hswh);

//lastly, print default 404
app.use((req, res) => {
    res.sendStatus(404);
});

app.listen(80, "0.0.0.0");