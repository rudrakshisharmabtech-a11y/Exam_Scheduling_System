USE examination_management;

-- INNER JOIN: sections with their department and course.
SELECT se.sec_id, se.semester, se.year, d.dept_name, c.title AS course_title
FROM sections se
INNER JOIN departments d ON d.dept_name = se.dept_name
INNER JOIN courses c ON c.course_id = se.course_id;

-- LEFT JOIN: every section, including sections without enrolled students.
SELECT se.sec_id, se.semester, st.student_id, st.student_name
FROM sections se
LEFT JOIN enrolls en ON en.sec_id = se.sec_id
LEFT JOIN students st ON st.student_id = en.student_id
ORDER BY se.sec_id, st.student_name;

-- Students enrolled in each section.
SELECT se.sec_id, c.title, st.student_id, st.student_name
FROM sections se
JOIN courses c ON c.course_id = se.course_id
JOIN enrolls en ON en.sec_id = se.sec_id
JOIN students st ON st.student_id = en.student_id
ORDER BY se.sec_id, st.student_name;

-- Students assigned to each exam.
SELECT e.exam_id, e.exam_date, st.student_id, st.student_name
FROM exams e
JOIN takes t ON t.exam_id = e.exam_id
JOIN students st ON st.student_id = t.student_id
ORDER BY e.exam_id, st.student_name;

-- Exam schedule with room, time slot, invigilator, and student count.
SELECT e.exam_id, e.exam_date, e.exam_time, r.room_number,
       ts.start_time, ts.end_time, i.invigilator_name,
       COUNT(t.student_id) AS student_count
FROM exams e
JOIN rooms r ON r.room_id = e.room_id
JOIN time_slots ts ON ts.slot_id = e.slot_id
JOIN invigilators i ON i.invigilator_id = e.invigilator_id
LEFT JOIN takes t ON t.exam_id = e.exam_id
GROUP BY e.exam_id, e.exam_date, e.exam_time, r.room_number,
         ts.start_time, ts.end_time, i.invigilator_name
ORDER BY e.exam_date, e.exam_time;

-- COUNT and GROUP BY: enrollment count per section.
SELECT sec_id, COUNT(student_id) AS enrolled_students
FROM enrolls
GROUP BY sec_id;

-- HAVING: sections with at least two enrolled students.
SELECT sec_id, COUNT(student_id) AS enrolled_students
FROM enrolls
GROUP BY sec_id
HAVING COUNT(student_id) >= 2;

-- Rooms large enough for a requested cohort; replace 25 as needed.
SELECT room_id, room_number, capacity
FROM rooms
WHERE capacity >= 25
ORDER BY capacity;

-- Slots with no exam at the requested date; replace the date as needed.
SELECT ts.slot_id, ts.start_time, ts.end_time
FROM time_slots ts
WHERE NOT EXISTS (
  SELECT 1 FROM exams e
  WHERE e.slot_id = ts.slot_id AND e.exam_date = '2026-11-10'
);

-- Primary-key / foreign-key demonstration. This duplicate enrollment should fail.
-- INSERT INTO enrolls (sec_id, student_id) VALUES (1, 1);
-- This section insert should fail because the department does not exist.
-- INSERT INTO sections (semester, year, dept_name, course_id)
-- VALUES ('Fall', 2026, 'Unknown Department', 1);

-- Example data changes. Run only in a disposable database.
-- INSERT INTO students (student_name, email) VALUES ('Demo Student', 'demo@example.edu');
-- UPDATE students SET student_name = 'Demo Student Updated' WHERE email = 'demo@example.edu';
-- DELETE FROM students WHERE email = 'demo@example.edu';
