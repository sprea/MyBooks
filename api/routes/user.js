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

    //Logout utente
    app.post('/logout', (req, res) => {
        req.session.destroy(null);
        res.clearCookie(this.cookie, { path: '/'});
        res.render('landing', {messaggio: 'utente uscito correttamente', req: req});
    })

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

                var plaintextPassword = req.body.password;

                var same = bcrypt.compareSync(plaintextPassword, rows[0].Password);

                if (same) {
                    req.session.logged_in = true;
                    req.session.logged_in_email_address = req.body.email;
                    res.redirect('/libreria');
                }else {
                    res.render('auth/login', { messaggio: "Email o password errati", req: req });
                    return;
                }

            })
        });
    });

    app.post('/registrati', async (req, res) => {

        if(req.body.nome.length == 0 || req.body.cognome.length == 0 || req.body.email.length == 0 || req.body.password.length == 0)
        {
            res.render('auth/register', {messaggio : "Tutti i campi sono obbligatori", req: req});
            return;
        }

        try{
            const hashedPassword = await bcrypt.hash(req.body.password, 10);

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
    
                                req.session.logged_in = true;
                                req.session.logged_in_email_address = req.body.email_address;

                                res.redirect('/libreria');
                            })
                        })
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