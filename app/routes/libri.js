module.exports = function(app, pool, axios)
{
    require('dotenv').config();
    var env = process.env.NODE_ENV;
    var db;

    if(env === 'production')
    {
        db = process.env.DB_NAME;
    }else
    {
        db = process.env.DB_NAME_DEV;
    }

    //Middleware che gestisce l'accesso alle pagine protette
    function requirePageLogin(req, res, next)
    {
        if(req.session && req.session.logged_in)
        {
            next();
        }else
        {
            res.redirect('/login');
        }
    }


    //routes frontend webapp

    //Pagina condivisione libreria

    app.get('/libreria/:idutente/condividi/', (req, res) => {

        var Idutente = req.params.idutente;
        var Utente;

        pool.getConnection((err, connection) => 
        {
            if (err) {
                throw err;
            }

            connection.query('SELECT Nome, Cognome, Email FROM ' + db + '.Utenti WHERE Id = ?', [Idutente], (err, rows) => {
               

                if(err)
                {
                    console.error(err);
                }

                if(rows.length <= 0)
                {
                    res.render('sharedlibrarynotfound');
                    return;
                }else
                {
                    Utente = rows[0];
                    connection.query('SELECT * FROM ' + db + '.Libri WHERE Id_Utente = ?', [Idutente], (err, rows) => {
                        connection.release();

                        if (err) {
                            console.error(err);
                        }

                        res.render('sharedlibrary', { libri: rows, utente: Utente });
                    });
                }
            });
        })

    });

    //Pagina che mostra i libri inseriti
    app.get('/libreria', requirePageLogin, (req, res) => {
        
        pool.getConnection((err, connection) => 
        {
            if (err) {
                throw err;
            }

            connection.query('SELECT * FROM ' + db + '.Libri WHERE Id_Utente = ?', [req.session.logged_in_id], (err, rows) => 
            {
                connection.release();

                if (err) {
                    console.error(err);
                }
                
                res.render('index', { libri: rows, errore: '', req: req});
            })

            
        })
    });

    //Pagina caricamento nuovo libro
    app.get('/libreria/aggiungi', requirePageLogin, (req, res) => {
        res.render('add', {errore: '', req: req});
    });

    //Route aggiunta libro tramite form
    app.post('/libreria/aggiungi', requirePageLogin, (req, res) => {

        const params = req.body;
        
        var alreadyIn = false;

        if(params.length === 0)
        {
            res.render('add', {errore: 'Impossibile aggiungere il libro', req: req});
            return;
        }

        if(params.Isbn.length > 13 || params.Isbn.length < 13)
        {
            res.render('add', {errore: 'Isbn non valido', req: req});
            return;
        }
        
        var googleBooksApiUrl = "https://www.googleapis.com/books/v1/volumes?q=isbn:" + params.Isbn;

        axios.get(googleBooksApiUrl).then(function (response){

            if(response.data.totalItems <= 0)
            {
                res.render('add', {errore: 'Libro non trovato...', req: req});
                return;
            }

            var book = response.data.items[0];
            var googleBookId = response.data.items[0].id;
            var titolo = (book["volumeInfo"]["title"]);
            var autori = (book["volumeInfo"]["authors"]);
            var pagine = (book["volumeInfo"]["pageCount"]);
            var descrizione = null;
            var genere = null;
            var copertina = (book["volumeInfo"]["imageLinks"]["thumbnail"]);

            if(params.PagineLette > pagine)
            {
                res.render('add', {errore: 'Il libro ha meno pagine di quelle lette', req: req});
                return;
            }

            if(params.PagineLette < 0)
            {
                res.render('add', {errore: 'Pagine lette negative', req: req});
                return;
            }

            if(params.PagineLette == pagine)
            {
                params.Completato = true;
            }

            autori = autori.toString();

            axios.get('https://www.googleapis.com/books/v1/volumes/' + googleBookId).then(function (response){
                var book = response.data;

                descrizione = (book["volumeInfo"]["description"]);
                genere = (book["volumeInfo"]["categories"]);

                if(descrizione == null)
                {
                    descrizione = 'Descrizione non trovata';
                }

                if(genere == null)
                {
                    genere = 'Genere non trovato';
                }

                genere = genere.toString();

                pool.getConnection((err, connection) => {
                    if (err) {
                        throw err;
                    }

                    connection.query('SELECT * FROM ' + db + '.Libri WHERE Isbn = ? AND Id_Utente = ?', [params.Isbn, req.session.logged_in_id], (err, rows) => {

                        if(err)
                        {
                            console.error(err);
                        }

                        if(rows.length > 0)
                        {
                            alreadyIn = true;
                        }

                        if (alreadyIn) {
                            res.render('add', { errore: 'Libro già inserito nella libreria', req: req });
                            res.end();
                            return;
                        }else
                        {
                            var sql = 'INSERT INTO ' + db + '.Libri (Isbn, Titolo, Autore, Pagine, Genere, PagineLette, Completato, Impressioni, Valutazione, urlCopertina, Descrizione, Id_Utente) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);';
                        
                            connection.query(sql, [params.Isbn, titolo, autori, pagine, genere, params.PagineLette, params.Completato, params.Impressioni, params.Valutazione, copertina, descrizione, req.session.logged_in_id], (err, rows) => 
                            {
                                connection.release();
            
                                if (err) {
                                    console.error(err);
                                    res.render('add', {errore: 'Errore generico', req: req});
                                    return;
                                }
            
                                console.log('Libro con isbn: ' + params.Isbn + ' aggiunto');
            
                                res.redirect('/libreria');
                            });
                        }
                    });
                });
                console.log("Chiamata a google books api effettuata");
            }).catch(function (error){
                console.error(error);
            });
        }).catch(function (error){
            console.error(error);
        }).finally(function (){
            console.info('post /libreria/aggiungi conclusa');
        })
    });

    //Pagina modifica
    app.get('/libreria/modifica/:id', requirePageLogin, (req, res) => {

        var id = req.params.id;

        if(id.length < 13 || id.length > 13)
        {
            res.redirect('/libreria');
            return;
        }

        pool.getConnection((err, connection) => 
        {
            if (err) {
                throw err;
            }

            connection.query('SELECT * FROM ' + db + '.Libri where Isbn = ? AND Id_Utente = ?', [id, req.session.logged_in_id], (err, rows) => 
            {
                connection.release();

                if (err) {
                    console.error(err);
                }

                if (rows.length <= 0) //libro non trovato
                {
                    res.redirect('/libreria');
                    return;
                }
                
                res.render('edit', {
                    Isbn: rows[0].Isbn,
                    Pagine: rows[0].Pagine,
                    PagineLette: rows[0].PagineLette,
                    Completato: rows[0].Completato,
                    Impressioni: rows[0].Impressioni,
                    Valutazione: rows[0].Valutazione,
                    errore: '',
                    req: req
                });
            })
        })

    });

    //Modifica del libro tramite isbn
    app.post('/libreria/modifica/:id', requirePageLogin, (req, res) => {

        var id = req.params.id;
        var paginelette = req.body.PagineLette;
        var completato = req.body.Completato;
        var impressioni = req.body.Impressioni;
        var valutazione = req.body.Valutazione;
        var pagine = req.body.Pagine;

        if(paginelette.length === 0)
        {
            res.render('edit', {errore: 'Inserisci un valore nelle pagine lette', Isbn: id, req: req});
            return;
        }

        if(paginelette > pagine)
        {
            res.render('edit', {
                errore: 'Il libro ha meno pagine di quelle lette', 
                Isbn: id,
                Pagine: pagine,
                PagineLette: paginelette,
                Completato: completato,
                Impressioni: impressioni,
                Valutazione: valutazione,
                req: req
            });
            return;
        }

        if(paginelette < 0)
        {
            res.render('edit', {
                errore: 'Pagine lette negative',
                Isbn: id,
                Pagine: pagine,
                PagineLette: paginelette,
                Completato: completato,
                Impressioni: impressioni,
                Valutazione: valutazione,
                req: req
            });
            return;
        }

        if(pagine == paginelette)
        {
            completato = true;
        }
    
        var sql = 'UPDATE ' + db + '.Libri SET PagineLette = ?, Completato = ?, Impressioni = ?, Valutazione = ? WHERE Isbn = ? AND Id_Utente = ?;'

        pool.getConnection((err, connection) => {
            
            if (err) {
                res.render('edit', {
                    errore: 'Errore database',
                    Isbn: id,
                    Pagine: pagine,
                    PagineLette: paginelette,
                    Completato: completato,
                    Impressioni: impressioni,
                    Valutazione: valutazione,
                    req: req
                });
                throw err;
            }

            connection.query(sql, [paginelette, completato, impressioni, valutazione, id, req.session.logged_in_id], (err, rows) => {
                    
                connection.release();

                if (err) {
                    console.error(err);
                    res.render('index', {
                        errore: 'Libro non trovato o isbn errato',
                        Isbn: id,
                        Pagine: pagine,
                        PagineLette: paginelette,
                        Completato: completato,
                        Impressioni: impressioni,
                        Valutazione: valutazione,
                        req: req
                    });
                    return;
                }

                console.log('Libro con isbn: ' + id + ' modificato');
                res.redirect('/libreria');
            });
        })
    });

    //Eliminazione di un particolare libro
    app.get('/libreria/elimina/:id', requirePageLogin, (req, res) => {
        var id = req.params.id;

        pool.getConnection((err, connection) => {
            if(err)
            {
                res.redirect('/libreria');
                return;
            }

            var sql = 'DELETE FROM ' + db + '.Libri WHERE Isbn = ? AND Id_Utente = ?;'

            connection.query(sql, [id, req.session.logged_in_id], (err, rows) => {
                
                if(err)
                {
                    console.error(err);
                }

                console.log('Libro con isbn: ' + id + ' eliminato')
                res.redirect('/libreria');
            })
        })
    });

    //Funzione ricerca per i libri
    app.get('/libreria/ricerca', requirePageLogin, (req, res) => {
        
        var ricerca = req.query.ricerca;

        if(ricerca.length == 0)
        {
            res.redirect('/libreria');
            return;
        }

        ricerca = '%' + ricerca + '%';

        pool.getConnection((err, connection) => {
            
            if(err)
            {
                res.redirect('/libreria');
                return;
            }

            var ricercaTitolo = "SELECT * from " + db + ".Libri WHERE Titolo LIKE ? AND Id_Utente = ?;"
            var ricercaGenere = "SELECT * from " + db + ".Libri WHERE Genere LIKE ? AND Id_Utente = ?;"
            var ricercaAutore = "SELECT * from " + db + ".Libri WHERE Autore LIKE ? AND Id_Utente = ?;"

            
            connection.query(ricercaTitolo, [ricerca, req.session.logged_in_id], (err, rows) => {

                if(err)
                {
                    console.error(err);
                }

                if(rows.length <= 0)
                {
                    connection.query(ricercaGenere, [ricerca, req.session.logged_in_id], (err, rows) => {

                        if (err) {
                            console.error(err);
                        }

                        if(rows.length <= 0)
                        {
                            connection.query(ricercaAutore, [ricerca, req.session.logged_in_id], (err, rows) => {
                                if (err) {
                                    console.error(err);
                                }

                                connection.release();

                                if(rows.length <= 0)
                                {
                                    res.render('search', {n: rows.length, req: req});
                                    return;
                                }else
                                {
                                    res.render('search', {libri: rows, n: rows.length, req: req});
                                    return;
                                }

                            });
                        }else
                        {
                            res.render('search', {libri: rows, n: rows.length, req: req});
                            return;
                        }

                    });
                }else
                {
                    res.render('search', {libri: rows, n: rows.length, req: req});
                    return;
                }
            });
        })

    });
}