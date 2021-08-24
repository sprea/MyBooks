//Inclusione dei moduli
const express = require('express');
const mysql = require('mysql');
const path = require('path');
const https = require('https');
const http = require('http');
const axios = require('axios');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

var app = express();
const porta = process.env.PORT || 5000;
const config = require('./config');
const cookieParser = require('cookie-parser');


//L'api risponde in formato json
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}));

//Autenticazione
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
    secret: process.env.COOKIE_SECRET,
    maxAge: 86400000,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 86400000,
        path: '/',
        httpOnly: true
    }
}));

//ejs settings
//app.set('views', './api/views');
app.set('views', path.join(__dirname, 'api/views'));
app.set('view engine', 'ejs');

//Connessione database mysql
db = config.database;
const pool = mysql.createPool(db);

require('./api/routes/libri')(app, pool, axios);
require('./api/routes/user')(app, pool, bcrypt);

app.get('/', (req, res) => {
    res.render('landing', { messaggio: '', req: req });
});

//App in ascolto
app.listen(porta, () => console.info('In ascolto sulla porta ' + porta));
