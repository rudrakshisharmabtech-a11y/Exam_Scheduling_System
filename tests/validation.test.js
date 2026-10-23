const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resources } = require('../src/controllers/resources');
const { validateResourceInput } = require('../src/validation');

test('rejects impossible calendar dates', () => {
  assert.throws(
    () => validateResourceInput(resources.exams, {
      exam_date: '2026-02-31',
      exam_time: '09:00',
      invigilator_id: 1,
      room_id: 1,
      slot_id: 1
    }),
    /YYYY-MM-DD/
  );
});

test('rejects invalid 24-hour times', () => {
  assert.throws(
    () => validateResourceInput(resources.exams, {
      exam_date: '2026-02-28',
      exam_time: '27:00',
      invigilator_id: 1,
      room_id: 1,
      slot_id: 1
    }),
    /valid 24-hour time/
  );
});

test('rejects reversed time-slot ranges', () => {
  assert.throws(
    () => validateResourceInput(resources['time-slots'], {
      start_time: '13:00',
      end_time: '09:00'
    }),
    /later than/
  );
});
