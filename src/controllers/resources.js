const asyncHandler = require('../middleware/asyncHandler');
const { httpError, validateResourceInput } = require('../validation');

const resources = {
  departments: {
    table: 'departments',
    primaryKey: 'dept_name',
    fields: {
      dept_name: { type: 'string', required: true, maxLength: 100 },
      building: { type: 'string', required: true, maxLength: 100 }
    },
    searchable: ['dept_name', 'building']
  },
  courses: {
    table: 'courses',
    primaryKey: 'course_id',
    fields: {
      title: { type: 'string', required: true, maxLength: 150 },
      credits: { type: 'integer', required: true, min: 1 }
    },
    searchable: ['title']
  },
  sections: {
    table: 'sections',
    primaryKey: 'sec_id',
    fields: {
      semester: { type: 'string', required: true, maxLength: 20 },
      year: { type: 'integer', required: true, min: 2000 },
      dept_name: { type: 'string', required: true, maxLength: 100 },
      course_id: { type: 'integer', required: true, min: 1 }
    },
    searchable: ['semester', 'dept_name']
  },
  students: {
    table: 'students',
    primaryKey: 'student_id',
    fields: {
      student_name: { type: 'string', required: true, maxLength: 120 },
      email: { type: 'string', required: true, maxLength: 254, format: 'email' }
    },
    searchable: ['student_name', 'email']
  },
  exams: {
    table: 'exams',
    primaryKey: 'exam_id',
    fields: {
      exam_date: { type: 'date', required: true },
      exam_time: { type: 'time', required: true },
      invigilator_id: { type: 'integer', required: true, min: 1 },
      room_id: { type: 'integer', required: true, min: 1 },
      slot_id: { type: 'integer', required: true, min: 1 }
    },
    searchable: ['exam_date']
  },
  invigilators: {
    table: 'invigilators',
    primaryKey: 'invigilator_id',
    fields: {
      invigilator_name: { type: 'string', required: true, maxLength: 120 },
      contact: { type: 'string', required: true, maxLength: 40 }
    },
    searchable: ['invigilator_name', 'contact']
  },
  rooms: {
    table: 'rooms',
    primaryKey: 'room_id',
    fields: {
      room_number: { type: 'string', required: true, maxLength: 30 },
      capacity: { type: 'integer', required: true, min: 1 }
    },
    searchable: ['room_number']
  },
  'time-slots': {
    table: 'time_slots',
    primaryKey: 'slot_id',
    fields: {
      start_time: { type: 'time', required: true },
      end_time: { type: 'time', required: true }
    },
    searchable: []
  }
};

function resourceController(pool, resource) {
  const { table, primaryKey } = resource;
  const order = table === 'departments' ? primaryKey : primaryKey;

  return {
    list: asyncHandler(async (req, res) => {
      const search = String(req.query.search || '').trim();
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      if (search && resource.searchable.length) {
        sql += ` WHERE ${resource.searchable.map((column) => `${column} LIKE ?`).join(' OR ')}`;
        params.push(...resource.searchable.map(() => `%${search}%`));
      }
      sql += ` ORDER BY ${order}`;
      const [rows] = await pool.execute(sql, params);
      res.json(rows);
    }),
    get: asyncHandler(async (req, res) => {
      const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`, [req.params.id]);
      if (!rows.length) throw httpError('Record not found.', 404);
      res.json(rows[0]);
    }),
    create: asyncHandler(async (req, res) => {
      const values = validateResourceInput(resource, req.body);
      if (table === 'exams') {
        const row = await saveExam(pool, values);
        return res.status(201).json(row);
      }
      const columns = Object.keys(values);
      const placeholders = columns.map(() => '?').join(', ');
      const [result] = await pool.execute(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        columns.map((column) => values[column])
      );
      const id = values[primaryKey] || result.insertId;
      const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`, [id]);
      res.status(201).json(rows[0] || { ...values, [primaryKey]: id });
    }),
    update: asyncHandler(async (req, res) => {
      const values = validateResourceInput(resource, req.body, true);
      if (table === 'exams') {
        const row = await saveExam(pool, values, req.params.id);
        return res.json(row);
      }
      if (table === 'rooms' && values.capacity !== undefined) {
        await updateRoom(pool, req.params.id, values);
        const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`, [req.params.id]);
        return res.json(rows[0]);
      }
      if (table === 'time_slots') {
        const row = await updateTimeSlot(pool, req.params.id, values);
        return res.json(row);
      }
      const columns = Object.keys(values);
      const assignments = columns.map((column) => `${column} = ?`).join(', ');
      const [result] = await pool.execute(
        `UPDATE ${table} SET ${assignments} WHERE ${primaryKey} = ?`,
        [...columns.map((column) => values[column]), req.params.id]
      );
      if (!result.affectedRows) throw httpError('Record not found.', 404);
      const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`, [req.params.id]);
      res.json(rows[0]);
    }),
    remove: asyncHandler(async (req, res) => {
      const [result] = await pool.execute(`DELETE FROM ${table} WHERE ${primaryKey} = ?`, [req.params.id]);
      if (!result.affectedRows) throw httpError('Record not found.', 404);
      res.status(204).end();
    })
  };
}

async function saveExam(pool, values, id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let examValues = values;
    if (id) {
      const [currentRows] = await connection.execute(
        'SELECT * FROM exams WHERE exam_id = ? FOR UPDATE',
        [id]
      );
      if (!currentRows.length) throw httpError('Record not found.', 404);
      const current = { ...currentRows[0] };
      delete current.exam_id;
      examValues = { ...current, ...values };
    }
    const [slotRows] = await connection.execute(
      'SELECT start_time, end_time FROM time_slots WHERE slot_id = ? FOR UPDATE',
      [examValues.slot_id]
    );
    if (!slotRows.length) throw httpError('Selected time slot does not exist.', 400);
    const [roomRows] = await connection.execute(
      'SELECT capacity FROM rooms WHERE room_id = ? FOR UPDATE',
      [examValues.room_id]
    );
    if (!roomRows.length) throw httpError('Selected room does not exist.', 400);
    const [invigilatorRows] = await connection.execute(
      'SELECT invigilator_id FROM invigilators WHERE invigilator_id = ? FOR UPDATE',
      [examValues.invigilator_id]
    );
    if (!invigilatorRows.length) throw httpError('Selected invigilator does not exist.', 400);

    const examTime = String(examValues.exam_time);
    const startTime = String(slotRows[0].start_time);
    const endTime = String(slotRows[0].end_time);
    if (examTime < startTime || examTime >= endTime) {
      throw httpError('Exam time must fall within the selected time slot.');
    }

    const conflictParams = [examValues.exam_date, endTime, startTime];
    let conflictSql = `SELECT e.exam_id
      FROM exams e JOIN time_slots existing_slot ON existing_slot.slot_id = e.slot_id
      WHERE e.exam_date = ?
        AND existing_slot.start_time < ? AND existing_slot.end_time > ?`;
    if (id) {
      conflictSql += ' AND e.exam_id <> ?';
      conflictParams.push(id);
    }
    const [conflicts] = await connection.execute(
      `${conflictSql} AND (e.room_id = ? OR e.invigilator_id = ?) FOR UPDATE`,
      [...conflictParams, examValues.room_id, examValues.invigilator_id]
    );
    if (conflicts.length) {
      throw httpError('The room or invigilator is already scheduled for that date and time slot.', 409);
    }

    if (id) {
      const [countRows] = await connection.execute(
        'SELECT COUNT(*) AS student_count FROM takes WHERE exam_id = ?',
        [id]
      );
      if (Number(countRows[0].student_count) > roomRows[0].capacity) {
        throw httpError('The selected room is too small for the students already assigned to this exam.', 409);
      }
      const keys = Object.keys(examValues);
      const [result] = await connection.execute(
        `UPDATE exams SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE exam_id = ?`,
        [...keys.map((key) => examValues[key]), id]
      );
      if (!result.affectedRows) throw httpError('Record not found.', 404);
    } else {
      const keys = Object.keys(examValues);
      const [result] = await connection.execute(
        `INSERT INTO exams (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        keys.map((key) => examValues[key])
      );
      id = result.insertId;
    }

    const [rows] = await connection.execute('SELECT * FROM exams WHERE exam_id = ?', [id]);
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateRoom(pool, roomId, values) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rooms] = await connection.execute(
      'SELECT room_id FROM rooms WHERE room_id = ? FOR UPDATE',
      [roomId]
    );
    if (!rooms.length) throw httpError('Record not found.', 404);
    const [overCapacity] = await connection.execute(
      `SELECT e.exam_id
       FROM exams e LEFT JOIN takes t ON t.exam_id = e.exam_id
       WHERE e.room_id = ?
       GROUP BY e.exam_id
       HAVING COUNT(t.student_id) > ?
       LIMIT 1`,
      [roomId, values.capacity]
    );
    if (overCapacity.length) {
      throw httpError('Room capacity cannot be lower than the number of students assigned to an exam in this room.', 409);
    }
    const columns = Object.keys(values);
    await connection.execute(
      `UPDATE rooms SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE room_id = ?`,
      [...columns.map((column) => values[column]), roomId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateTimeSlot(pool, slotId, values) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [current] = await connection.execute(
      'SELECT start_time, end_time FROM time_slots WHERE slot_id = ? FOR UPDATE',
      [slotId]
    );
    if (!current.length) throw httpError('Record not found.', 404);
    const startTime = values.start_time ?? String(current[0].start_time);
    const endTime = values.end_time ?? String(current[0].end_time);
    if (startTime >= endTime) throw httpError('end_time must be later than start_time.');
    const [assigned] = await connection.execute(
      'SELECT COUNT(*) AS exam_count FROM exams WHERE slot_id = ?',
      [slotId]
    );
    if (Number(assigned[0].exam_count) > 0) {
      throw httpError('This time slot is assigned to exams. Change those exams before editing the slot.', 409);
    }
    const columns = Object.keys(values);
    await connection.execute(
      `UPDATE time_slots SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE slot_id = ?`,
      [...columns.map((column) => values[column]), slotId]
    );
    const [rows] = await connection.execute('SELECT * FROM time_slots WHERE slot_id = ?', [slotId]);
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { resourceController, resources };
