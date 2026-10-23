const asyncHandler = require('../middleware/asyncHandler');
const { httpError, validatePositiveIds } = require('../validation');

function relationshipRoutes(router, pool) {
  router.get('/sections/:id/students', asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT s.student_id, s.student_name, s.email
       FROM enrolls e JOIN students s ON s.student_id = e.student_id
       WHERE e.sec_id = ? ORDER BY s.student_name`,
      [req.params.id]
    );
    res.json(rows);
  }));

  router.post('/enrollments', asyncHandler(async (req, res) => {
    validatePositiveIds(req.body, ['student_id', 'sec_id']);
    await pool.execute(
      'INSERT INTO enrolls (student_id, sec_id) VALUES (?, ?)',
      [Number(req.body.student_id), Number(req.body.sec_id)]
    );
    res.status(201).json({ message: 'Student enrolled in section.' });
  }));

  router.delete('/enrollments/:studentId/:sectionId', asyncHandler(async (req, res) => {
    const studentId = Number(req.params.studentId);
    const sectionId = Number(req.params.sectionId);
    validatePositiveIds({ student_id: studentId, sec_id: sectionId }, ['student_id', 'sec_id']);
    const [result] = await pool.execute(
      'DELETE FROM enrolls WHERE student_id = ? AND sec_id = ?',
      [studentId, sectionId]
    );
    if (!result.affectedRows) throw httpError('Enrollment not found.', 404);
    res.status(204).end();
  }));

  router.get('/exams/:id/students', asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT s.student_id, s.student_name, s.email
       FROM takes t JOIN students s ON s.student_id = t.student_id
       WHERE t.exam_id = ? ORDER BY s.student_name`,
      [req.params.id]
    );
    res.json(rows);
  }));

  router.post('/exam-assignments', asyncHandler(async (req, res) => {
    validatePositiveIds(req.body, ['student_id', 'exam_id']);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [examRows] = await connection.execute(
        'SELECT exam_id, room_id FROM exams WHERE exam_id = ? FOR UPDATE',
        [Number(req.body.exam_id)]
      );
      if (!examRows.length) throw httpError('Exam not found.', 404);
      const [roomRows] = await connection.execute(
        'SELECT capacity FROM rooms WHERE room_id = ? FOR UPDATE',
        [examRows[0].room_id]
      );
      const [countRows] = await connection.execute(
        'SELECT COUNT(*) AS student_count FROM takes WHERE exam_id = ?',
        [Number(req.body.exam_id)]
      );
      if (Number(countRows[0].student_count) >= roomRows[0].capacity) {
        throw httpError('Room capacity would be exceeded.', 409);
      }
      await connection.execute(
        'INSERT INTO takes (student_id, exam_id) VALUES (?, ?)',
        [Number(req.body.student_id), Number(req.body.exam_id)]
      );
      await connection.commit();
      res.status(201).json({ message: 'Student assigned to exam.' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }));

  router.delete('/exam-assignments/:studentId/:examId', asyncHandler(async (req, res) => {
    const studentId = Number(req.params.studentId);
    const examId = Number(req.params.examId);
    validatePositiveIds({ student_id: studentId, exam_id: examId }, ['student_id', 'exam_id']);
    const [result] = await pool.execute(
      'DELETE FROM takes WHERE student_id = ? AND exam_id = ?',
      [studentId, examId]
    );
    if (!result.affectedRows) throw httpError('Exam assignment not found.', 404);
    res.status(204).end();
  }));

  router.get('/exam-schedule', asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const where = search ? 'WHERE i.invigilator_name LIKE ? OR r.room_number LIKE ? OR e.exam_date LIKE ?' : '';
    const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const [rows] = await pool.execute(
      `SELECT e.exam_id, e.exam_date, e.exam_time,
              r.room_id, r.room_number, r.capacity,
              i.invigilator_id, i.invigilator_name,
              ts.slot_id, ts.start_time, ts.end_time,
              (SELECT COUNT(*) FROM takes t WHERE t.exam_id = e.exam_id) AS student_count
       FROM exams e
       JOIN rooms r ON r.room_id = e.room_id
       JOIN invigilators i ON i.invigilator_id = e.invigilator_id
       JOIN time_slots ts ON ts.slot_id = e.slot_id
       ${where}
       ORDER BY e.exam_date, e.exam_time`,
      params
    );
    res.json(rows);
  }));
}

module.exports = { relationshipRoutes };
