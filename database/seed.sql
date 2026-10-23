USE examination_management;

INSERT INTO departments (dept_name, building) VALUES
  ('Computer Science', 'Innovation Hall'),
  ('Mathematics', 'Science Block')
ON DUPLICATE KEY UPDATE building = VALUES(building);

INSERT INTO courses (course_id, title, credits) VALUES
  (1, 'Database Management Systems', 4),
  (2, 'Discrete Mathematics', 3),
  (3, 'Web Application Development', 3)
ON DUPLICATE KEY UPDATE title = VALUES(title), credits = VALUES(credits);

INSERT INTO sections (sec_id, semester, year, dept_name, course_id) VALUES
  (1, 'Fall', 2026, 'Computer Science', 1),
  (2, 'Fall', 2026, 'Mathematics', 2),
  (3, 'Spring', 2027, 'Computer Science', 3)
ON DUPLICATE KEY UPDATE semester = VALUES(semester), year = VALUES(year);

INSERT INTO students (student_id, student_name, email) VALUES
  (1, 'Aarav Sharma', 'aarav.sharma@example.edu'),
  (2, 'Mira Patel', 'mira.patel@example.edu'),
  (3, 'Kabir Rao', 'kabir.rao@example.edu'),
  (4, 'Ananya Singh', 'ananya.singh@example.edu')
ON DUPLICATE KEY UPDATE student_name = VALUES(student_name);

INSERT INTO enrolls (sec_id, student_id) VALUES
  (1, 1), (1, 2), (1, 3), (2, 2), (2, 4), (3, 1), (3, 4)
ON DUPLICATE KEY UPDATE student_id = VALUES(student_id);

INSERT INTO invigilators (invigilator_id, invigilator_name, contact) VALUES
  (1, 'Dr. Neha Verma', '+91-9000000001'),
  (2, 'Prof. Arjun Mehta', '+91-9000000002')
ON DUPLICATE KEY UPDATE invigilator_name = VALUES(invigilator_name);

INSERT INTO rooms (room_id, room_number, capacity) VALUES
  (1, 'A-101', 40),
  (2, 'B-204', 30),
  (3, 'Lab-3', 24)
ON DUPLICATE KEY UPDATE capacity = VALUES(capacity);

INSERT INTO time_slots (slot_id, start_time, end_time) VALUES
  (1, '09:00:00', '12:00:00'),
  (2, '13:00:00', '16:00:00')
ON DUPLICATE KEY UPDATE end_time = VALUES(end_time);

INSERT INTO exams (exam_id, exam_date, exam_time, invigilator_id, room_id, slot_id) VALUES
  (1, '2026-11-10', '09:00:00', 1, 1, 1),
  (2, '2026-11-12', '13:00:00', 2, 2, 2)
ON DUPLICATE KEY UPDATE exam_date = VALUES(exam_date), exam_time = VALUES(exam_time);

INSERT INTO takes (student_id, exam_id) VALUES
  (1, 1), (2, 1), (3, 1), (2, 2), (4, 2)
ON DUPLICATE KEY UPDATE exam_id = VALUES(exam_id);
