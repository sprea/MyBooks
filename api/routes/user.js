module.exports = function(app, pool)
{
    app.get('/login', (req, res) => {
        res.render('auth/login');
    });

    app.get('/registrati', (req, res) => {
        res.render('auth/register');
    })
}