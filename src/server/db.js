// import pg promise 
const pgp = require('pg-promise')();

// import .env variables 
const dotenv = require('dotenv');
dotenv.config();

// connect PGClient, passing in Elephant SQL
const db = pgp(process.env.POSTGRES_URL);

// export the PGClient as db
module.exports = db;