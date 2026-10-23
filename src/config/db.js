const mysql = require('mysql2/promise');

function createPool(config = process.env) {
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  }

  return mysql.createPool({
    host: config.DB_HOST,
    port: Number(config.DB_PORT || 3306),
    user: config.DB_USER,
    password: config.DB_PASSWORD || '',
    database: config.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(config.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: true
  });
}

module.exports = { createPool };
