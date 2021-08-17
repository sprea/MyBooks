//Inclusione dei moduli
const express = require('express');
const mysql = require('mysql');
const path = require('path');
const https = require('https');
const http = require('http');
const axios = require('axios');

//Autenticazione
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');


var app = express();
const porta = process.env.PORT || 5000;
const config = require('./config');

//L'api risponde in formato json
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}));

//ejs settings
//app.set('views', './api/views');
app.set('views', path.join(__dirname, 'api/views'));
app.set('view engine', 'ejs');

//Connessione database mysql
db = config.database;
const pool = mysql.createPool(db);

require('./api/routes/libri')(app, pool, axios);
require('./api/routes/user')(app, pool);

app.get('/', (req, res) => {
    res.render('landing');
});

//App in ascolto
app.listen(porta, () => console.info('In ascolto sulla porta ' + porta));
