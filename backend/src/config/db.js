const mysql = require('mysql2/promise');
const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SSL
} = require('./env');

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  // Un límite bajo evita agotar conexiones cuando Vercel crea varias instancias.
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 3),
  queueLimit: 0,
  dateStrings: true,
  enableKeepAlive: true,
  ssl: DB_SSL ? { rejectUnauthorized: true } : undefined
});

module.exports = { pool };
