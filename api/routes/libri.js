const { response } = require("express");

module.exports = function(app, pool, axios)
{

    //Lista di tutti i libri nel db
    app.get('/libri', (req, res) => {
        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            connection.query('SELECT * FROM Libri', (err, rows) => {
                connection.release();

                if (err) {
                    console.error(err);
                }

                res.send(rows);
            })
        }
        )
    });

    //Lista di un particolare libro
    app.get('/libri/:id', (req, res) => {

        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            connection.query('SELECT * FROM Libri where Isbn = ?', [req.params.id], (err, rows) => {
                connection.release();

                if (err) {
                    console.error(err);
                }

                res.send(rows);
            })
        }
        )
    });

    //Elimina un libro dato l'isbn
    app.delete('/libri/:id', (req, res) => {

        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            connection.query('DELETE FROM Libri where Isbn = ?', [req.params.id], (err, rows) => {
                connection.release();

                if (err) {
                    console.error(err);
                }

                res.send('Libro con isbn: ' + [req.params.id] + ' rimosso');
            })
        }
        )
    });

    //Aggiunge un nuovo libro
    app.post('/libri', (req, res) => {

        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            const params = req.body     //prendo il nuovo oggetto libro dalla richiesta

            connection.query('INSERT INTO Libri SET ?', params, (err, rows) => {
                connection.release();

                if (err) {
                    console.error(err);
                }

                res.send('Libro con isbn: ' + params.Isbn + ' aggiunto');
            })
        }
        )
    });

    //Modifica di un libro
    app.put('/libri', (req, res) => {

        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            const { Isbn, Titolo, Autore, Pagine, PagineLette, Completato, Impressioni, Valutazione } = req.body;

            connection.query('UPDATE Libri SET Titolo = ?, Autore = ?, Pagine = ?, PagineLette = ?, Completato = ?, Impressioni = ?, Valutazione = ? WHERE Isbn = ?', [Titolo, Autore, Pagine, PagineLette, Completato, Impressioni, Valutazione, Isbn],
                (err, rows) => {
                    connection.release();

                    if (err) {
                        console.error(err);
                    }

                    res.send('Libro con isbn: ' + Isbn + ' modificato');
                })
        })
    });

    //routes frontend webapp

    //Pagina che mostra i libri inseriti
    app.get('/libreria', (req, res) => {
        pool.getConnection((err, connection) => 
        {
            if (err) {
                throw err;
            }

            connection.query('SELECT * FROM Libri', (err, rows) => 
            {
                connection.release();

                if (err) {
                    console.error(err);
                }
                
                res.render('index', { rows: rows, errore: ''});
            })

            
        })
    });

    //Pagina caricamento nuovo libro
    app.get('/libreria/aggiungi', (req, res) => {
        res.render('add', {errore: ''});
    });

    //Route aggiunta libro tramite form
    app.post('/libreria/aggiungi', (req, res) => {

        const params = req.body;

        if(params.length === 0)
        {
            res.status(500);
            res.render('add', {errore: 'Impossibile aggiungere il libro'});
            return;
        }

        if(params.Isbn.length > 13 || params.Isbn.length < 13)
        {
            res.status(500);
            res.render('add', {errore: 'Isbn non valido'});
            return;
        }
        
        var googleBooksApiUrl = "https://www.googleapis.com/books/v1/volumes?q=isbn:" + params.Isbn;

        axios.get(googleBooksApiUrl).then(function (response){
            var book = response.data.items[0];
            var googleBookId = response.data.items[0].id;
            var titolo = (book["volumeInfo"]["title"]);
            var autori = (book["volumeInfo"]["authors"]);
            var pagine = (book["volumeInfo"]["pageCount"]);
            var descrizione = null;
            var copertina = (book["volumeInfo"]["imageLinks"]["thumbnail"]);

            if(params.PagineLette > pagine)
            {
                res.status(500);
                res.render('add', {errore: 'Il libro ha meno pagine di quelle lette'});
                return;
            }

            if(params.PagineLette < 0)
            {
                res.status(500);
                res.render('add', {errore: 'Pagine lette negative'});
                return;
            }

            if(params.PagineLette == pagine)
            {
                params.Completato = true;
            }

            let autoriString = autori.toString();

            axios.get('https://www.googleapis.com/books/v1/volumes/' + googleBookId).then(function (response){
                var book = response.data;

                descrizione = (book["volumeInfo"]["description"]);

                if(descrizione == null)
                {
                    descrizione = 'Descrizione non trovata';
                }

                pool.getConnection((err, connection) => {
                    if (err) {
                        throw err;
                    }

                    var sql = "INSERT INTO MyBooks.Libri (Isbn, Titolo, Autore, Pagine, PagineLette, Completato, Impressioni, Valutazione, urlCopertina, Descrizione) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                    connection.query(sql, [params.Isbn, titolo, autoriString, pagine, params.PagineLette, params.Completato, params.Impressioni, params.Valutazione, copertina, descrizione], (err, rows) => 
                    {
                        connection.release();
    
                        if (err) {
                            console.error(err);
                            res.render('add', {errore: 'Errore generico'});
                            return;
                        }
    
                        console.log('Libro con isbn: ' + params.Isbn + ' aggiunto');
    
                        res.redirect('/libreria');
                    })
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
    app.get('/libreria/modifica/:id', (req, res) => {

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

            connection.query('SELECT * FROM Libri where Isbn = ?', [id], (err, rows) => 
            {
                connection.release();

                if (err) {
                    console.error(err);
                }

                if (rows.length <= 0) //libro non trovato
                {
                    res.render('index');
                }
                
                res.render('edit', {
                    Isbn: rows[0].Isbn,
                    Pagine: rows[0].Pagine,
                    PagineLette: rows[0].PagineLette,
                    Completato: rows[0].Completato,
                    Impressioni: rows[0].Impressioni,
                    Valutazione: rows[0].Valutazione,
                    errore: ''
                });
            })
        })

    });

    app.post('/libreria/modifica/:id', (req, res) => {

        var id = req.params.id;
        var paginelette = req.body.PagineLette;
        var completato = req.body.Completato;
        var impressioni = req.body.Impressioni;
        var valutazione = req.body.Valutazione;
        var pagine = req.body.Pagine;

        if(paginelette.length === 0)
        {
            res.status(500);
            res.render('edit', {errore: 'Inserisci un valore nelle pagine lette', Isbn: id});
            return;
        }

        if(paginelette > pagine)
        {
            res.status(500);
            res.render('edit', {
                errore: 'Il libro ha meno pagine di quelle lette', 
                Isbn: id,
                Pagine: pagine,
                PagineLette: paginelette,
                Completato: completato,
                Impressioni: impressioni,
                Valutazione: valutazione
            });
            return;
        }

        if(paginelette < 0)
        {
            res.status(500);
            res.render('edit', {
                errore: 'Pagine lette negative',
                Isbn: id,
                Pagine: pagine,
                PagineLette: paginelette,
                Completato: completato,
                Impressioni: impressioni,
                Valutazione: valutazione
            });
            return;
        }

        if(pagine == paginelette)
        {
            completato = true;
        }
    
        var sql = 'UPDATE MyBooks.Libri SET PagineLette = ?, Completato = ?, Impressioni = ?, Valutazione = ? WHERE Isbn = ?;'

        pool.getConnection((err, connection) => {
            
            if (err) {
                res.render('edit', {
                    errore: 'Errore database',
                    Isbn: id,
                    Pagine: pagine,
                    PagineLette: paginelette,
                    Completato: completato,
                    Impressioni: impressioni,
                    Valutazione: valutazione
                });
                throw err;
            }

            connection.query(sql, [paginelette, completato, impressioni, valutazione, id], (err, rows) => {
                    
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
                        Valutazione: valutazione
                    });
                    return;
                }

                console.log('Libro con isbn: ' + id + ' modificato');
                res.redirect('/libreria');
            });
        })
    });

    app.get('/libreria/elimina/:id', (req, res) => {
        var id = req.params.id;

        pool.getConnection((err, connection) => {
            if(err)
            {
                res.redirect('/libreria');
                return;
            }

            var sql = 'DELETE FROM MyBooks.Libri WHERE Isbn = ?;'

            connection.query(sql, [id], (err, rows) => {
                
                if(err)
                {
                    console.error(err);
                }

                res.redirect('/libreria');
            })
        })
    });

    app.get('/libreria/ricerca', (req, res) => {
        var titolo = req.query.titolo;

        pool.getConnection((err, connection) => {
            if(err)
            {
                res.redirect('/libreria');
                return;
            }

            var sql = "SELECT * from MyBooks.Libri WHERE Titolo LIKE ?";
            titolo = '%' + titolo + '%';

            connection.query(sql, [titolo], (err, rows) => {
                
                if(err)
                {
                    console.error(err);
                }

                res.render('search', {libri: rows, n: rows.length});
            })
        })

    });
}