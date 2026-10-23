require('dotenv').config();
const { createApp } = require('./app');
const { createPool } = require('./config/db');

let pool;
try {
  pool = createPool();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = createApp(pool);
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Examination Management System listening on port ${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
