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
        }
        )
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
                
                res.render('index', { rows: rows });
            })

            
        })
    });

    //Pagina caricamento nuovo libro
    app.get('/libreria/aggiungi', (req, res) => {
        res.render('add');
    });

    app.post('/libreria/aggiungi', (req, res) => {

        const params = req.body;

        if(params.length === 0)
        {
            res.render('index', {errore: 'Impossibile aggiungere il libro'});
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

            axios.get('https://www.googleapis.com/books/v1/volumes/' + googleBookId).then(function (response){
                var book = response.data;

                descrizione = (book["volumeInfo"]["description"]);

                pool.getConnection((err, connection) => {
                    if (err) {
                        throw err;
                    }

                    var sql = "INSERT INTO MyBooks.Libri (Isbn, Titolo, Autore, Pagine, PagineLette, Completato, Impressioni, Valutazione, urlCopertina, Descrizione) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                    connection.query(sql, [params.Isbn, titolo, autori, pagine, params.PagineLette, params.Completato, params.Impressioni, params.Valutazione, copertina, descrizione], (err, rows) => 
                    {
                        connection.release();
    
                        if (err) {
                            console.error(err);
                            res.render('add');
                        }
    
                        console.log('Libro con isbn: ' + params.Isbn + ' aggiunto');
    
                        res.redirect('/libreria');
                    })
                });
            }).catch(function (error){
                console.error(error);
            });
        }).catch(function (error){
            console.error(error);
        }).finally(function (){
            console.log("Chiamata a google books api effettuata");
        })
    });
}