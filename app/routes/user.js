module.exports = function(app, pool, bcrypt)
{
    //Pagina login
    app.get('/login', (req, res) => {
        res.render('auth/login', {messaggio : "", req: req});
    });

    //Pagina di registrazione
    app.get('/registrati', (req, res) => {
        res.render('auth/register', {messaggio : "", req: req});
    });

    //Pagina profilo utente
    app.get('/profilo', (req, res) => {

        var user;

        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            connection.query('SELECT * from heroku_9a2800c73c30d21.Utenti WHERE Email = ?', [req.session.logged_in_email_address], (err, rows) => 
            {
                connection.release();

                if(rows.length <= 0)
                {
                    res.redirect('/');
                    return;
                }

                user = rows[0];

                res.render('auth/profile', { User: user, req: req, messaggio: '' });

            })
        });
    });

    //Modifica password utente
    app.post('/profilo', (req, res) => {

        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            connection.query('SELECT * from heroku_9a2800c73c30d21.Utenti WHERE Email = ?', [req.session.logged_in_email_address], (err, rows) => 
            {
                if(rows.length <= 0)
                {
                    res.render('auth/login', {messaggio : "Utente non trovato", req: req});
                    return;
                }

                var user = rows[0];

                var oldPassword = req.body.currentpassword;

                if(oldPassword.length == 0 && user.Password.length == 0)
                {
                    res.render('auth/profile', {messaggio : "I campi delle password sono vuoti", req: req});
                    return;
                }

                if(req.body.newpassword.length < 8)
                {
                    res.render('auth/profile', {messaggio: "La nuova password deve contenere almento 8 caratteri", req: req, User: user});
                    return;
                }

                try{
                    bcrypt.compare(oldPassword, user.Password).then(function(result) {
                        if(result)  //se e vero posso procedere con il cambio password
                        {
                            bcrypt.hash(req.body.newpassword, 10).then(function(hash) {
                                
                                connection.query('UPDATE heroku_9a2800c73c30d21.Utenti SET Password = ? WHERE Email = ?', [hash, req.session.logged_in_email_address], (err, rows) => {
                                    
                                    connection.release();
                                    res.redirect('/libreria');
                                });
                            });
                        }else
                        {
                            res.render('auth/profile', { messaggio: "La password attuale inserita non è corretta", req: req, User: user });
                            return;
                        }
                    });
                }catch(e)
                {
                    console.error(e);
                    return;
                }
            })
        });
    });

    //Logout utente
    app.post('/logout', (req, res) => {
        req.session = null;
        res.clearCookie(this.cookie, { path: '/'});
        res.render('landing', {messaggio: 'utente uscito correttamente', req: req});
    })

    //Login utente
    app.post('/login', (req, res) => {
        if(req.body.email.length == 0 || req.body.password.length == 0)
        {
            res.render('auth/login', {messaggio : "Tutti i campi sono obbligatori", req: req});
            return;
        }

        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            connection.query('SELECT * from heroku_9a2800c73c30d21.Utenti WHERE Email = ?', [req.body.email], (err, rows) => 
            {
                connection.release();

                if(rows.length <= 0)
                {
                    res.render('auth/login', {messaggio : "Utente non trovato", req: req});
                    return;
                }

                var idUtente = rows[0].Id;
                var plaintextPassword = req.body.password;
                var dbPassword = rows[0].Password;

                try{
                    bcrypt.compare(plaintextPassword, dbPassword).then(function (result) {
                        if (result) {
                            req.session.logged_in = true;
                            req.session.logged_in_email_address = req.body.email;
                            req.session.logged_in_id = idUtente;
                            res.redirect('/libreria');
                        } else {
                            res.render('auth/login', { messaggio: "Email o password errati", req: req });
                            return;
                        }
                    });
                }catch(e)
                {
                    console.error(e);
                    return;
                }
                

                /*
                var same = bcrypt.compareSync(plaintextPassword, rows[0].Password);

                if (same) {
                    req.session.logged_in = true;
                    req.session.logged_in_email_address = req.body.email;
                    req.session.logged_in_id = idUtente;
                    res.redirect('/libreria');
                }else {
                    res.render('auth/login', { messaggio: "Email o password errati", req: req });
                    return;
                }
                */

            })
        });
    });

    //Registrazione utente
    app.post('/registrati', (req, res) => {

        if(req.body.nome.length == 0 || req.body.cognome.length == 0 || req.body.email.length == 0 || req.body.password.length == 0)
        {
            res.render('auth/register', {messaggio : "Tutti i campi sono obbligatori", req: req});
            return;
        }

        if(req.body.password.length < 8)
        {
            res.render('auth/register', {messaggio : "La password deve contenere almeno 8 caratteri", req: req});
            return;
        }

        try{
            
            bcrypt.hash(req.body.password, 10).then(function(hash) {
                const hashedPassword = hash;

                pool.getConnection((err, connection) => {
                    if (err) {
                        throw err;
                    }

                    connection.query('SELECT * from heroku_9a2800c73c30d21.Utenti WHERE Email = ?', [req.body.email], (err, rows) => {

                        if (err) {
                            console.error(err);
                        }

                        if (rows.length <= 0) {
                            //l'utente si può registrare

                            connection.query('INSERT INTO heroku_9a2800c73c30d21.Utenti(Nome, Cognome, Email, Password) VALUES (?, ?, ?, ?);', [req.body.nome, req.body.cognome, req.body.email, hashedPassword], (err, rows) => {

                                if (err) {
                                    console.error(err);
                                }
                            });

                            connection.query('SELECT * FROM heroku_9a2800c73c30d21.Utenti WHERE Email = ?', [req.body.email], (err, data) => {
                                connection.release();

                                var idUtente = data[0].Id;

                                req.session.logged_in = true;
                                req.session.logged_in_email_address = req.body.email;
                                req.session.logged_in_id = idUtente;

                                res.redirect('/libreria');
                            });
                        } else {
                            //l'utente è gia registrato
                            res.render('auth/register', { messaggio: 'Impossibile completare la registrazione questa email è gia registrata', req: req });
                        }
                    })
                });
            });

        }catch(e){
            console.error(e);
            return;
        }

    });
}