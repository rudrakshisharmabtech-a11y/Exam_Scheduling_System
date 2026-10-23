const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateResourceInput(resource, input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError('Request body must be a JSON object.');
  }
  const values = {};
  const fields = resource.fields;

  for (const key of Object.keys(input)) {
    if (key !== resource.primaryKey && !fields[key]) {
      throw httpError(`Unknown field: ${key}`);
    }
  }

  for (const [name, definition] of Object.entries(fields)) {
    const value = input[name];
    if (value === undefined) {
      if (!partial && definition.required) throw httpError(`${name} is required.`);
      continue;
    }
    if (value === null || String(value).trim() === '') {
      if (definition.required) throw httpError(`${name} is required.`);
      values[name] = null;
      continue;
    }

    if (definition.type === 'string') {
      const text = String(value).trim();
      if (text.length > definition.maxLength) {
        throw httpError(`${name} must be no longer than ${definition.maxLength} characters.`);
      }
      if (definition.format === 'email' && !EMAIL_PATTERN.test(text)) {
        throw httpError('email must be a valid email address.');
      }
      values[name] = text;
    } else if (definition.type === 'integer') {
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw httpError(`${name} must be an integer.`);
      if (definition.min !== undefined && number < definition.min) {
        throw httpError(`${name} must be at least ${definition.min}.`);
      }
      values[name] = number;
    } else if (definition.type === 'date') {
      const date = String(value);
      const parsed = DATE_PATTERN.test(date) ? new Date(`${date}T00:00:00Z`) : null;
      if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        throw httpError(`${name} must use YYYY-MM-DD format.`);
      }
      values[name] = date;
    } else if (definition.type === 'time') {
      if (!TIME_PATTERN.test(String(value))) throw httpError(`${name} must use HH:MM or HH:MM:SS format.`);
      const [hours, minutes, seconds = '00'] = String(value).split(':').map(Number);
      if (hours > 23 || minutes > 59 || seconds > 59) {
        throw httpError(`${name} must be a valid 24-hour time.`);
      }
      values[name] = String(value).length === 5 ? `${value}:00` : String(value);
    } else {
      values[name] = value;
    }
  }

  if (!partial && Object.keys(values).length !== Object.keys(fields).length) {
    throw httpError('All required fields must be provided.');
  }
  if (partial && Object.keys(values).length === 0) {
    throw httpError('Provide at least one field to update.');
  }
  if (resource.table === 'time_slots') {
    const startTime = values.start_time;
    const endTime = values.end_time;
    if (startTime !== undefined && endTime !== undefined && startTime >= endTime) {
      throw httpError('end_time must be later than start_time.');
    }
  }
  return values;
}

function validatePositiveIds(input, keys) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError('Request body must be a JSON object.');
  }
  for (const key of keys) {
    const value = Number(input[key]);
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw httpError(`${key} must be a positive integer.`);
    }
  }
}

module.exports = { httpError, validatePositiveIds, validateResourceInput };
