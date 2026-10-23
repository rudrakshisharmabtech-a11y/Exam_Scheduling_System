require('dotenv').config({ path: process.env.TEST_ENV_FILE || '.env' });
const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

const enabled = process.env.RUN_DB_TESTS === '1';
const dbTest = enabled ? test : test.skip;
let pool;

before(async () => {
  if (enabled) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'examination_management',
      connectionLimit: 2
    });
    await pool.execute('SELECT 1');
  }
});

after(async () => {
  if (pool) await pool.end();
});

dbTest('seeded tables and relationships can be queried', async () => {
  const [rows] = await pool.execute(
    `SELECT e.exam_id, COUNT(t.student_id) AS student_count
     FROM exams e LEFT JOIN takes t ON t.exam_id = e.exam_id
     GROUP BY e.exam_id ORDER BY e.exam_id LIMIT 1`
  );
  assert.ok(rows.length);
  assert.ok(Number(rows[0].student_count) >= 0);
});

dbTest('database enforces duplicate enrollments', async () => {
  const [rows] = await pool.execute(
    'SELECT sec_id, student_id FROM enrolls ORDER BY sec_id, student_id LIMIT 1'
  );
  assert.ok(rows.length, 'Run database/seed.sql before database tests.');
  await assert.rejects(
    pool.execute('INSERT INTO enrolls (sec_id, student_id) VALUES (?, ?)', [
      rows[0].sec_id,
      rows[0].student_id
    ]),
    { code: 'ER_DUP_ENTRY' }
  );
});
