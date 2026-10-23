const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server;
let baseUrl;
const calls = [];
let examUpdateParams;
const fakePool = {
  async execute(sql, params = []) {
    calls.push({ sql, params });
    if (sql === 'SELECT 1') return [[{ 1: 1 }], []];
    if (sql.includes('SELECT * FROM departments ORDER BY dept_name')) {
      return [[{ dept_name: 'Computer Science', building: 'Innovation Hall' }], []];
    }
    if (sql.includes('INSERT INTO departments')) return [{ insertId: 0, affectedRows: 1 }, []];
    if (sql.includes('SELECT * FROM departments WHERE dept_name = ?')) {
      return [[{ dept_name: params[0], building: 'Innovation Hall' }], []];
    }
    return [[], []];
  },
  async getConnection() {
    return {
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {},
      async execute(sql, params = []) {
        calls.push({ sql, params });
        if (sql.includes('SELECT * FROM exams WHERE exam_id = ? FOR UPDATE')) {
          return [[{
            exam_id: 1, exam_date: '2026-11-10', exam_time: '09:00:00',
            invigilator_id: 1, room_id: 1, slot_id: 1
          }], []];
        }
        if (sql.includes('SELECT start_time, end_time FROM time_slots')) {
          return [[{ start_time: '09:00:00', end_time: '12:00:00' }], []];
        }
        if (sql.includes('SELECT capacity FROM rooms')) return [[{ capacity: 40 }], []];
        if (sql.includes('SELECT invigilator_id FROM invigilators')) return [[{ invigilator_id: 1 }], []];
        if (sql.includes('SELECT e.exam_id')) return [[], []];
        if (sql.includes('SELECT COUNT(*) AS student_count FROM takes')) return [[{ student_count: 3 }], []];
        if (sql.startsWith('UPDATE exams SET')) {
          examUpdateParams = params;
          return [{ affectedRows: 1 }, []];
        }
        if (sql === 'SELECT * FROM exams WHERE exam_id = ?') {
          return [[{
            exam_id: 1, exam_date: '2026-11-10', exam_time: '09:00:00',
            invigilator_id: 1, room_id: 2, slot_id: 1
          }], []];
        }
        throw new Error(`Unexpected test SQL: ${sql}`);
      }
    };
  }
};

before(async () => {
  server = createApp(fakePool).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint confirms database connectivity', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
});

test('frontend entry page is served from the application', async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Examination Management/);
  assert.match(html, /href="css\/style\.css"/);
  assert.match(html, /Upcoming exam schedule/);
  assert.match(html, /Register a student/);
  assert.match(html, /<div class="stat-number">84<\/div>/);
  assert.match(html, /<div class="stat-number">15<\/div>/);
  assert.match(html, /<div class="stat-number">23<\/div>/);
  assert.match(html, /<div class="stat-number">10<\/div>/);
  assert.match(html, /Dr\. Neha Verma/);
});

test('linked stylesheet is served with the app interface styles', async () => {
  const response = await fetch(`${baseUrl}/css/style.css?v=2`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /\.page-heading/);
});

test('department listing returns records from the database adapter', async () => {
  const response = await fetch(`${baseUrl}/api/departments`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    { dept_name: 'Computer Science', building: 'Innovation Hall' }
  ]);
});

test('department creation uses a parameterized insert', async () => {
  const response = await fetch(`${baseUrl}/api/departments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dept_name: 'Physics', building: 'North Block' })
  });
  assert.equal(response.status, 201);
  const insert = calls.find((call) => call.sql.includes('INSERT INTO departments'));
  assert.ok(insert);
  assert.deepEqual(insert.params, ['Physics', 'North Block']);
  assert.ok(!insert.sql.includes('Physics'));
});

test('invalid input is rejected before reaching SQL', async () => {
  const beforeCalls = calls.length;
  const response = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Invalid credits', credits: 0 })
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /at least 1/);
  assert.equal(calls.length, beforeCalls);
});

test('partial exam updates preserve omitted schedule fields', async () => {
  const response = await fetch(`${baseUrl}/api/exams/1`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ room_id: 2 })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).room_id, 2);
  assert.deepEqual(examUpdateParams, [
    '2026-11-10', '09:00:00', 1, 2, 1, '1'
  ]);
});
