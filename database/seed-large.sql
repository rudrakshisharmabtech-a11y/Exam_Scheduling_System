USE examination_management;

-- Adds a repeatable demonstration dataset without replacing the starter seed.
-- This script owns the generated ID ranges used below. It clears those ranges
-- first so rerunning the seed (including after an older, larger version) keeps
-- the demonstration dataset at the documented moderate size.

DELETE FROM exams WHERE exam_id BETWEEN 101 AND 140;
DELETE FROM sections WHERE sec_id BETWEEN 101 AND 180;
DELETE FROM students
WHERE student_id BETWEEN 1001 AND 1250
  AND email LIKE 'sample.student.%@example.edu';
DELETE FROM invigilators WHERE invigilator_id BETWEEN 101 AND 120;
DELETE FROM rooms WHERE room_id BETWEEN 101 AND 112;
DELETE FROM courses
WHERE course_id BETWEEN 101 AND 140
  AND title LIKE 'Sample Course %';
DELETE FROM time_slots WHERE slot_id BETWEEN 101 AND 104;

INSERT INTO departments (dept_name, building) VALUES
  ('Physics', 'Science Block'),
  ('Chemistry', 'Science Block'),
  ('Biology', 'Life Sciences Building'),
  ('Economics', 'Business Hall'),
  ('History', 'Humanities Building'),
  ('Electrical Engineering', 'Engineering Center'),
  ('Business Administration', 'Business Hall'),
  ('Statistics', 'Science Block')
ON DUPLICATE KEY UPDATE building = VALUES(building);

INSERT INTO courses (course_id, title, credits)
WITH RECURSIVE numbers (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 12
)
SELECT
  100 + n,
  CONCAT('Sample Course ', LPAD(n, 2, '0')),
  2 + MOD(n, 3)
FROM numbers
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  credits = VALUES(credits);

INSERT INTO sections (sec_id, semester, year, dept_name, course_id)
WITH RECURSIVE numbers (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 20
)
SELECT
  100 + n,
  IF(MOD(n, 2) = 0, 'Fall', 'Spring'),
  2026 + MOD(FLOOR((n - 1) / 10), 2),
  CASE MOD(n - 1, 10)
    WHEN 0 THEN 'Computer Science'
    WHEN 1 THEN 'Mathematics'
    WHEN 2 THEN 'Physics'
    WHEN 3 THEN 'Chemistry'
    WHEN 4 THEN 'Biology'
    WHEN 5 THEN 'Economics'
    WHEN 6 THEN 'History'
    WHEN 7 THEN 'Electrical Engineering'
    WHEN 8 THEN 'Business Administration'
    ELSE 'Statistics'
  END,
  101 + MOD(n - 1, 12)
FROM numbers
ON DUPLICATE KEY UPDATE
  semester = VALUES(semester),
  year = VALUES(year),
  dept_name = VALUES(dept_name),
  course_id = VALUES(course_id);

INSERT INTO students (student_id, student_name, email)
WITH RECURSIVE numbers (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 80
)
SELECT
  1000 + n,
  CONCAT('Sample Student ', LPAD(n, 3, '0')),
  CONCAT('sample.student.', LPAD(n, 3, '0'), '@example.edu')
FROM numbers
ON DUPLICATE KEY UPDATE
  student_name = VALUES(student_name),
  email = VALUES(email);

INSERT INTO enrolls (sec_id, student_id)
WITH RECURSIVE students (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM students WHERE n < 80
),
section_choices (choice_no) AS (
  SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2
)
SELECT
  101 + MOD((students.n * 7) + (section_choices.choice_no * 7), 20),
  1000 + students.n
FROM students
CROSS JOIN section_choices
ON DUPLICATE KEY UPDATE student_id = VALUES(student_id);

INSERT INTO invigilators (invigilator_id, invigilator_name, contact)
WITH RECURSIVE numbers (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 8
)
SELECT
  100 + n,
  CONCAT('Sample Invigilator ', LPAD(n, 2, '0')),
  CONCAT('+1-555-01', LPAD(n, 2, '0'))
FROM numbers
ON DUPLICATE KEY UPDATE
  invigilator_name = VALUES(invigilator_name),
  contact = VALUES(contact);

INSERT INTO rooms (room_id, room_number, capacity)
WITH RECURSIVE numbers (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 6
)
SELECT
  100 + n,
  CONCAT('Hall-', LPAD(n, 2, '0')),
  60 + MOD(n * 5, 41)
FROM numbers
ON DUPLICATE KEY UPDATE
  room_number = VALUES(room_number),
  capacity = VALUES(capacity);

INSERT INTO time_slots (slot_id, start_time, end_time) VALUES
  (101, '08:00:00', '10:00:00'),
  (102, '10:30:00', '12:30:00'),
  (103, '13:00:00', '15:00:00'),
  (104, '15:30:00', '17:30:00')
ON DUPLICATE KEY UPDATE
  start_time = VALUES(start_time),
  end_time = VALUES(end_time);

INSERT INTO exams (exam_id, exam_date, exam_time, invigilator_id, room_id, slot_id)
WITH RECURSIVE numbers (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 8
)
SELECT
  100 + n,
  DATE_ADD('2026-11-16', INTERVAL FLOOR((n - 1) / 4) DAY),
  CASE MOD(n - 1, 4)
    WHEN 0 THEN '08:00:00'
    WHEN 1 THEN '10:30:00'
    WHEN 2 THEN '13:00:00'
    ELSE '15:30:00'
  END,
  101 + MOD(n - 1, 8),
  101 + MOD(n - 1, 6),
  101 + MOD(n - 1, 4)
FROM numbers
ON DUPLICATE KEY UPDATE
  exam_date = VALUES(exam_date),
  exam_time = VALUES(exam_time),
  invigilator_id = VALUES(invigilator_id),
  room_id = VALUES(room_id),
  slot_id = VALUES(slot_id);

INSERT INTO takes (student_id, exam_id)
WITH RECURSIVE students (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM students WHERE n < 80
),
exam_choices (choice_no) AS (
  SELECT 0 UNION ALL SELECT 1
)
SELECT
  1000 + students.n,
  101 + MOD(students.n + (exam_choices.choice_no * 3), 8)
FROM students
CROSS JOIN exam_choices
ON DUPLICATE KEY UPDATE exam_id = VALUES(exam_id);

-- Expected additional data: 8 departments, 12 courses, 20 sections,
-- 80 students, 240 enrollments, 8 invigilators, 6 rooms, 4 slots,
-- 8 exams, and 160 student-exam assignments.
SELECT 'departments' AS entity, COUNT(*) AS total FROM departments
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'sections', COUNT(*) FROM sections
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'enrollments', COUNT(*) FROM enrolls
UNION ALL SELECT 'invigilators', COUNT(*) FROM invigilators
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'time slots', COUNT(*) FROM time_slots
UNION ALL SELECT 'exams', COUNT(*) FROM exams
UNION ALL SELECT 'exam assignments', COUNT(*) FROM takes;
