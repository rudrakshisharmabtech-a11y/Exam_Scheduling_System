CREATE DATABASE IF NOT EXISTS examination_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE examination_management;

CREATE TABLE IF NOT EXISTS departments (
  dept_name VARCHAR(100) NOT NULL,
  building VARCHAR(100) NOT NULL,
  PRIMARY KEY (dept_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  course_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  credits TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (course_id),
  CONSTRAINT chk_courses_credits_positive CHECK (credits > 0),
  INDEX idx_courses_title (title)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sections (
  sec_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  semester VARCHAR(20) NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  dept_name VARCHAR(100) NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (sec_id),
  INDEX idx_sections_dept (dept_name),
  INDEX idx_sections_course (course_id),
  INDEX idx_sections_term (year, semester),
  CONSTRAINT fk_sections_department FOREIGN KEY (dept_name)
    REFERENCES departments (dept_name) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sections_course FOREIGN KEY (course_id)
    REFERENCES courses (course_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  student_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  PRIMARY KEY (student_id),
  UNIQUE KEY uq_students_email (email),
  INDEX idx_students_name (student_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrolls (
  sec_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (sec_id, student_id),
  INDEX idx_enrolls_student (student_id),
  CONSTRAINT fk_enrolls_section FOREIGN KEY (sec_id)
    REFERENCES sections (sec_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_enrolls_student FOREIGN KEY (student_id)
    REFERENCES students (student_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invigilators (
  invigilator_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invigilator_name VARCHAR(120) NOT NULL,
  contact VARCHAR(40) NOT NULL,
  PRIMARY KEY (invigilator_id),
  INDEX idx_invigilators_name (invigilator_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  room_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_number VARCHAR(30) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (room_id),
  UNIQUE KEY uq_rooms_number (room_number),
  CONSTRAINT chk_rooms_capacity_positive CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS time_slots (
  slot_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (slot_id),
  CONSTRAINT chk_time_slots_range CHECK (start_time < end_time),
  UNIQUE KEY uq_time_slots_range (start_time, end_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exams (
  exam_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_date DATE NOT NULL,
  exam_time TIME NOT NULL,
  invigilator_id INT UNSIGNED NOT NULL,
  room_id INT UNSIGNED NOT NULL,
  slot_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (exam_id),
  INDEX idx_exams_date_slot (exam_date, slot_id),
  INDEX idx_exams_room (room_id),
  INDEX idx_exams_invigilator (invigilator_id),
  CONSTRAINT fk_exams_invigilator FOREIGN KEY (invigilator_id)
    REFERENCES invigilators (invigilator_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_exams_room FOREIGN KEY (room_id)
    REFERENCES rooms (room_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_exams_slot FOREIGN KEY (slot_id)
    REFERENCES time_slots (slot_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS takes (
  student_id INT UNSIGNED NOT NULL,
  exam_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (student_id, exam_id),
  INDEX idx_takes_exam (exam_id),
  CONSTRAINT fk_takes_student FOREIGN KEY (student_id)
    REFERENCES students (student_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_takes_exam FOREIGN KEY (exam_id)
    REFERENCES exams (exam_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
