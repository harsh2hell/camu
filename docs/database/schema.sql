-- ==============================================================================
-- DBS Global University Campus Portal ("DBS-Camu Next")
-- Core Database Schema (PostgreSQL 15+)
-- Designed for High Concurrency, Fast Attendance Audits, and Role-Based Access
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ENUMS & DOMAINS
-- ------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'STUDENT',
    'FACULTY',
    'HOD',
    'DEAN',
    'REGISTRAR_ADMIN',
    'EXAM_CONTROLLER'
);

CREATE TYPE attendance_status AS ENUM (
    'PRESENT',
    'ABSENT',
    'ON_DUTY',        -- OD for college approved fests, hackathons, sports
    'MEDICAL_LEAVE',  -- Approved with doctor note
    'EXEMPTED'        -- Late registration or institutional exemption
);

CREATE TYPE leave_status AS ENUM (
    'PENDING',
    'RECOMMENDED_BY_MENTOR',
    'APPROVED_BY_HOD',
    'REJECTED'
);

CREATE TYPE assignment_submission_status AS ENUM (
    'PENDING',
    'SUBMITTED_ON_TIME',
    'SUBMITTED_LATE',
    'GRADED',
    'MISSED'
);

CREATE TYPE day_of_week AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY'
);

-- ------------------------------------------------------------------------------
-- 2. ACADEMIC STRUCTURE (University, Schools, Departments, Programs)
-- ------------------------------------------------------------------------------
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(16) UNIQUE NOT NULL, -- e.g. "SOET", "SOM", "SOC"
    name VARCHAR(128) NOT NULL,       -- e.g. "School of Engineering & Technology"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code VARCHAR(24) UNIQUE NOT NULL, -- e.g. "BTECH_CSE", "MBA_FIN", "BBA"
    name VARCHAR(128) NOT NULL,       -- e.g. "B.Tech in Computer Science & Engineering"
    duration_semesters INT NOT NULL DEFAULT 8,
    degree_level VARCHAR(32) NOT NULL, -- "UNDERGRADUATE", "POSTGRADUATE", "DIPLOMA"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    start_year INT NOT NULL,          -- e.g. 2023
    end_year INT NOT NULL,            -- e.g. 2027
    batch_name VARCHAR(64) NOT NULL,  -- e.g. "B.Tech CSE 2023-27"
    current_semester INT NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (program_id, start_year, end_year)
);

CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name VARCHAR(16) NOT NULL,        -- e.g. "Section A", "Section B"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (batch_id, name)
);

-- ------------------------------------------------------------------------------
-- 3. USERS & PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL, -- e.g. harsh.23cse@dbs.edu.in
    full_name VARCHAR(128) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roll_number VARCHAR(32) UNIQUE NOT NULL, -- e.g. "DBS/23/CSE/042"
    registration_no VARCHAR(32) UNIQUE NOT NULL, -- e.g. "230101042"
    batch_id UUID NOT NULL REFERENCES batches(id),
    section_id UUID NOT NULL REFERENCES sections(id),
    current_semester INT NOT NULL DEFAULT 1,
    current_cgpa NUMERIC(4, 2) DEFAULT 0.00,
    mentor_faculty_id UUID REFERENCES users(id),
    blood_group VARCHAR(8),
    emergency_contact VARCHAR(20),
    guardian_name VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE faculty_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. "DBS-FAC-108"
    department_id UUID NOT NULL REFERENCES departments(id),
    designation VARCHAR(64) NOT NULL,          -- e.g. "Assistant Professor", "HOD"
    cabin_location VARCHAR(64),                -- e.g. "Academic Block 2, Room 304"
    specialization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. COURSES & OFFERINGS
-- ------------------------------------------------------------------------------
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id),
    code VARCHAR(20) UNIQUE NOT NULL,  -- e.g. "CS302"
    title VARCHAR(128) NOT NULL,       -- e.g. "Design and Analysis of Algorithms"
    credits INT NOT NULL DEFAULT 4,
    lecture_hours INT NOT NULL DEFAULT 3,
    tutorial_hours INT NOT NULL DEFAULT 0,
    practical_hours INT NOT NULL DEFAULT 2,
    syllabus_doc_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE course_offerings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    primary_faculty_id UUID NOT NULL REFERENCES users(id),
    academic_year VARCHAR(16) NOT NULL, -- e.g. "2026-2027"
    semester INT NOT NULL,              -- e.g. 5
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (course_id, section_id, academic_year, semester)
);

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, course_offering_id)
);

-- ------------------------------------------------------------------------------
-- 5. TIMETABLE & SCHEDULING
-- ------------------------------------------------------------------------------
CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    day_name day_of_week NOT NULL,
    start_time TIME NOT NULL,           -- e.g. 09:30:00
    end_time TIME NOT NULL,             -- e.g. 10:25:00
    room_number VARCHAR(32) NOT NULL,   -- e.g. "LT-201"
    is_lab BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. ATTENDANCE & LEAVE MANAGEMENT (The Core Camu Pain-Point Fix)
-- ------------------------------------------------------------------------------
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL,
    faculty_id UUID NOT NULL REFERENCES users(id),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME NOT NULL,
    topic_taught TEXT,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    is_locked BOOLEAN DEFAULT FALSE -- Once finalized, requires HOD unlock
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'PRESENT',
    remarks TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (session_id, student_id)
);

CREATE TABLE leave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(32) NOT NULL, -- "ON_DUTY_EVENT", "MEDICAL", "CASUAL"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    supporting_doc_url TEXT,
    status leave_status DEFAULT 'PENDING',
    mentor_remarks TEXT,
    hod_remarks TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. ACADEMICS: ASSIGNMENTS & LEARNING RESOURCES
-- ------------------------------------------------------------------------------
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    attachment_url TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    total_marks INT NOT NULL DEFAULT 100,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_file_url TEXT,
    submission_text TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status assignment_submission_status DEFAULT 'SUBMITTED_ON_TIME',
    score NUMERIC(5, 2),
    feedback TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMPTZ,
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_assignments_offering_due ON assignments(course_offering_id, due_date);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);

CREATE TABLE learning_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    unit_module VARCHAR(64), -- e.g. "Module 3: Dynamic Programming"
    file_url TEXT NOT NULL,
    file_type VARCHAR(32),   -- "PDF", "SLIDES", "CODE", "VIDEO_LINK"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. EXAMINATIONS & GRADING
-- ------------------------------------------------------------------------------
CREATE TABLE exam_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL, -- "Internal Assessment 1", "Mid Term", "End Term"
    max_marks NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    weightage_percent NUMERIC(5, 2) NOT NULL -- e.g. 20.00%
);

CREATE TABLE student_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_component_id UUID NOT NULL REFERENCES exam_components(id) ON DELETE CASCADE,
    obtained_marks NUMERIC(5, 2) NOT NULL,
    entered_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, exam_component_id)
);

-- ------------------------------------------------------------------------------
-- 9. CAMPUS NOTICES & CIRCULARS
-- ------------------------------------------------------------------------------
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'ACADEMIC', -- "EXAM", "FEES", "SPORTS", "TRAINING_PLACEMENT"
    target_role user_role, -- NULL means all roles
    batch_id UUID REFERENCES batches(id), -- NULL means all batches
    is_pinned BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    posted_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. REAL-TIME AUDIT & INDEXES FOR HIGH-SPEED QUERIES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_session_course ON attendance_sessions(course_offering_id, session_date);
CREATE INDEX idx_timetable_lookup ON timetable_slots(course_offering_id, day_name);
CREATE INDEX idx_notices_active ON notices(created_at DESC, is_pinned DESC);
CREATE INDEX idx_enrollment_student ON enrollments(student_id);

-- ------------------------------------------------------------------------------
-- 11. FEES & FINANCIAL CLEARANCE
-- ------------------------------------------------------------------------------
CREATE TYPE fee_payment_status AS ENUM ('PAID', 'PARTIALLY_PAID', 'PENDING', 'OVERDUE');

CREATE TABLE fee_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(64) UNIQUE NOT NULL, -- e.g. "DBS/2026/FEE/10892"
    academic_term VARCHAR(32) NOT NULL,        -- e.g. "Odd Semester 2026-27"
    category VARCHAR(64) NOT NULL,             -- "Tuition & Lab Fee", "Hostel & Mess", "Exam Fee"
    total_amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0.00,
    due_date DATE NOT NULL,
    status fee_payment_status DEFAULT 'PENDING',
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
    transaction_ref VARCHAR(128) UNIQUE NOT NULL, -- Razorpay / Bank UTR
    payment_mode VARCHAR(32) NOT NULL,            -- "UPI", "NET_BANKING", "CHALLAN"
    amount NUMERIC(10, 2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. DIGITAL HOSTEL GATE PASS & SECURITY
-- ------------------------------------------------------------------------------
CREATE TYPE gate_pass_type AS ENUM ('DAY_OUTING', 'HOME_VISIT', 'EMERGENCY');
CREATE TYPE gate_pass_status AS ENUM ('PENDING_WARDEN', 'APPROVED', 'REJECTED', 'CHECKED_OUT', 'CHECKED_IN');

CREATE TABLE hostel_gate_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pass_number VARCHAR(32) UNIQUE NOT NULL, -- e.g. "GP-2026-8902"
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pass_type gate_pass_type NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    expected_return TIMESTAMPTZ NOT NULL,
    destination TEXT NOT NULL,
    reason TEXT NOT NULL,
    parent_consent_verified BOOLEAN DEFAULT TRUE,
    status gate_pass_status DEFAULT 'PENDING_WARDEN',
    warden_approved_by UUID REFERENCES users(id),
    actual_out_time TIMESTAMPTZ,
    actual_in_time TIMESTAMPTZ,
    qr_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. VIEW: FAST ATTENDANCE SUMMARY (Calculates % on the fly)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW student_attendance_summary AS
SELECT 
    e.student_id,
    c.id AS course_id,
    c.code AS course_code,
    c.title AS course_title,
    co.id AS course_offering_id,
    COUNT(ar.id) AS total_conducted_classes,
    COUNT(CASE WHEN ar.status IN ('PRESENT', 'ON_DUTY') THEN 1 END) AS attended_classes,
    ROUND(
        (COUNT(CASE WHEN ar.status IN ('PRESENT', 'ON_DUTY') THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(ar.id), 0)) * 100, 
        2
    ) AS attendance_percentage
FROM enrollments e
JOIN course_offerings co ON e.course_offering_id = co.id
JOIN courses c ON co.course_id = c.id
LEFT JOIN attendance_sessions s ON s.course_offering_id = co.id
LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = e.student_id
GROUP BY e.student_id, c.id, c.code, c.title, co.id;
