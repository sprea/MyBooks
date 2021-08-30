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

            connection.query('SELECT * from MyBooks.Utenti WHERE Email = ?', [req.session.logged_in_email_address], (err, rows) => 
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

            connection.query('SELECT * from MyBooks.Utenti WHERE Email = ?', [req.session.logged_in_email_address], (err, rows) => 
            {
                connection.release();

                if(rows.length <= 0)
                {
                    res.render('auth/login', {messaggio : "Utente non trovato", req: req});
                    return;
                }

                var user = rows[0];

                var oldPassword = req.body.currentpassword;

                var same = bcrypt.compareSync(oldPassword, rows[0].Password);

                if (same) {

                    const hashedPassword = bcrypt.hashSync(req.body.newpassword, 10);

                    connection.query('UPDATE MyBooks.Utenti SET Password = ? WHERE Email = ?', [hashedPassword, req.session.logged_in_email_address], (err, rows) => {
                        
                        res.redirect('/libreria');
                    });
                    
                }else {
                    res.render('auth/profile', { messaggio: "La password attuale inserita non è corretta", req: req, User: user });
                    return;
                }

            })
        });
    });

    //Logout utente
    app.post('/logout', (req, res) => {
        req.session.destroy(null);
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

            connection.query('SELECT * from MyBooks.Utenti WHERE Email = ?', [req.body.email], (err, rows) => 
            {
                connection.release();

                if(rows.length <= 0)
                {
                    res.render('auth/login', {messaggio : "Utente non trovato", req: req});
                    return;
                }

                var idUtente = rows[0].Id;

                var plaintextPassword = req.body.password;

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

        try{
            const hashedPassword = bcrypt.hashSync(req.body.password, 10);

            pool.getConnection((err, connection) => {
                if (err) {
                    throw err;
                }
    
                connection.query('SELECT * from MyBooks.Utenti WHERE Email = ?', [req.body.email], (err, rows) => {
                    connection.release();
    
                    if (err) {
                        console.error(err);
                    }
    
                    if(rows.length <= 0)
                    {
                        //l'utente si può registrare

                        pool.getConnection((err, connection) => {
                            if(err)
                            {
                                throw err;
                            }
    
                            connection.query('INSERT INTO MyBooks.Utenti(Nome, Cognome, Email, Password) VALUES (?, ?, ?, ?);', [req.body.nome, req.body.cognome, req.body.email, hashedPassword], (err, rows) => {
                                connection.release();

                                if(err)
                                {
                                    console.error(err);
                                }
                            })
                        });

                        pool.getConnection((err, connection) => {

                            if(err)
                            {
                                throw err;
                            }

                            connection.query('SELECT * FROM MyBooks.Utenti WHERE Email = ?', [req.body.email], (err, rows) => {
                                connection.release();

                                var idUtente = rows[0].Id;

                                req.session.logged_in = true;
                                req.session.logged_in_email_address = req.body.email;
                                req.session.logged_in_id = idUtente;

                                res.redirect('/libreria');
                            });
                        });
                    }else
                    {
                        //l'utente è gia registrato
    
                        res.render('auth/register', {messaggio: 'Impossibile completare la registrazione questa email è gia registrata', req: req});
                    }
                })
            });

        }catch{
            res.redirect('/registrati');
        }

    });
}