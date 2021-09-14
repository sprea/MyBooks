require('dotenv').config();

var env = process.env.NODE_ENV;
if(env === 'production')
{
    module.exports = {
        database:
        {
            connectionLimit: 10,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        }
    }
}else
{
    module.exports = {
        database:
        {
            connectionLimit: 10,
            host: process.env.DB_HOST_DEV,
            user: process.env.DB_USER_DEV,
            password: process.env.DB_PASSWORD_DEV,
            database: process.env.DB_NAME_DEV
        }
    }
}
