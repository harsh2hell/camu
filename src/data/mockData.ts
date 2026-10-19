export interface StudentInfo {
  name: string;
  rollNo: string;
  regNo: string;
  program: string;
  school: string;
  semester: number;
  section: string;
  cgpa: number;
  avatarUrl: string;
  mentor?: string;
  admissionNo?: string;
  admissionYear?: string;
  degree?: string;
  department?: string;
  academicYear?: string;
  studentStatus?: string;
}

export interface AttendanceSubject {
  code: string;
  title: string;
  faculty: string;
  attended: number;
  conducted: number;
  onDuty: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

export interface TimetableClass {
  id: string;
  time: string;
  subjectCode: string;
  subjectTitle: string;
  faculty: string;
  room: string;
  isLab: boolean;
  status: 'completed' | 'ongoing' | 'upcoming';
  note?: string;
}

export interface LeaveRequest {
  id: string;
  type: 'OD_HACKATHON' | 'OD_SPORTS' | 'MEDICAL' | 'CASUAL';
  title: string;
  dates: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedOn: string;
  approverRemarks?: string;
}

export interface AssignmentItem {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  dueTime: string;
  totalMarks: number;
  status: 'pending' | 'submitted' | 'graded';
  score?: number;
}

export interface CampusNotice {
  id: string;
  title: string;
  category: 'EXAM' | 'ACADEMIC' | 'PLACEMENT' | 'EVENT' | 'FEE';
  date: string;
  isPinned: boolean;
  description: string;
}

export const CURRENT_STUDENT: StudentInfo = {
  name: 'Harendra Pratap Singh',
  rollNo: '0251BTCS097',
  regNo: 'DBS25UG25234',
  admissionNo: 'DBS25UG25234',
  admissionYear: '2025-2026',
  program: 'B.Tech Computer Science & Engineering',
  school: 'Doon School of Advance Computing',
  department: 'Doon School of Advance Computing',
  degree: 'Undergraduate',
  academicYear: '2026-2027',
  studentStatus: 'Active',
  semester: 3,
  section: 'Sec A',
  cgpa: 8.64,
  mentor: 'Dr. Rajesh Sharma (Cabin: Block 2, Rm 304)',
  avatarUrl: '/harendra_avatar.png',
};

export const ATTENDANCE_DATA: AttendanceSubject[] = [
  {
    code: 'CS302',
    title: 'Design & Analysis of Algorithms',
    faculty: 'Dr. Rajesh Sharma',
    attended: 28,
    conducted: 32,
    onDuty: 2,
    percentage: 87.5,
    status: 'safe',
  },
  {
    code: 'CS304',
    title: 'Database Management Systems',
    faculty: 'Prof. Ananya Sen',
    attended: 25,
    conducted: 30,
    onDuty: 1,
    percentage: 83.3,
    status: 'safe',
  },
  {
    code: 'CS306',
    title: 'Computer Networks',
    faculty: 'Dr. Vivek Bhatt',
    attended: 21,
    conducted: 28,
    onDuty: 0,
    percentage: 75.0,
    status: 'warning',
  },
  {
    code: 'CS308',
    title: 'Operating Systems & Architecture',
    faculty: 'Prof. Meenakshi Joshi',
    attended: 18,
    conducted: 27,
    onDuty: 1,
    percentage: 66.7,
    status: 'danger',
  },
  {
    code: 'CS310',
    title: 'Cloud Computing & DevOps',
    faculty: 'Er. Kunal Rawat',
    attended: 24,
    conducted: 26,
    onDuty: 1,
    percentage: 92.3,
    status: 'safe',
  },
  {
    code: 'CS312',
    title: 'Machine Learning Foundations',
    faculty: 'Dr. Sunita Negi',
    attended: 26,
    conducted: 31,
    onDuty: 2,
    percentage: 83.9,
    status: 'safe',
  },
];

export const TODAY_CLASSES: TimetableClass[] = [
  {
    id: 'c1',
    time: '09:00 - 09:55 AM',
    subjectCode: 'CS302',
    subjectTitle: 'Design & Analysis of Algorithms',
    faculty: 'Dr. Rajesh Sharma',
    room: 'LT-204 (Block 1)',
    isLab: false,
    status: 'completed',
  },
  {
    id: 'c2',
    time: '10:00 - 10:55 AM',
    subjectCode: 'CS304',
    subjectTitle: 'Database Management Systems',
    faculty: 'Prof. Ananya Sen',
    room: 'LT-201 (Block 1)',
    isLab: false,
    status: 'ongoing',
  },
  {
    id: 'c3',
    time: '11:15 - 01:05 PM',
    subjectCode: 'CS302-L',
    subjectTitle: 'Algorithms Lab (Batch A1)',
    faculty: 'Dr. Rajesh Sharma & TA',
    room: 'Computing Lab 3 (Block 2)',
    isLab: true,
    status: 'upcoming',
    note: 'Carry your Dynamic Programming assignment sheets',
  },
  {
    id: 'c4',
    time: '02:00 - 02:55 PM',
    subjectCode: 'CS306',
    subjectTitle: 'Computer Networks',
    faculty: 'Dr. Vivek Bhatt',
    room: 'LT-305 (Block 1)',
    isLab: false,
    status: 'upcoming',
  },
  {
    id: 'c5',
    time: '03:00 - 03:55 PM',
    subjectCode: 'CS310',
    subjectTitle: 'Cloud Computing & DevOps',
    faculty: 'Er. Kunal Rawat',
    room: 'Seminar Hall B',
    isLab: false,
    status: 'upcoming',
  },
];

export const MOCK_LEAVES: LeaveRequest[] = [
  {
    id: 'LV-108',
    type: 'OD_HACKATHON',
    title: 'Smart India Hackathon 2026 Grand Finale',
    dates: '24 Oct 2026 - 26 Oct 2026 (3 Days)',
    reason: 'Selected for National Round at IIT Roorkee center with Team DevDBS.',
    status: 'APPROVED',
    appliedOn: '16 Oct 2026',
    approverRemarks: 'Approved. Carry official university ID & OD letter to venue.',
  },
  {
    id: 'LV-112',
    type: 'MEDICAL',
    title: 'Severe Viral Fever',
    dates: '12 Oct 2026 (1 Day)',
    reason: 'Visited Max Hospital Dehradun, prescribed rest.',
    status: 'APPROVED',
    appliedOn: '13 Oct 2026',
    approverRemarks: 'Medical certificate verified and attendance exempted.',
  },
  {
    id: 'LV-115',
    type: 'OD_SPORTS',
    title: 'North Zone Inter-University Basketball Tournament',
    dates: '02 Nov 2026 - 04 Nov 2026 (3 Days)',
    reason: 'Representing DBS Global University Basketball Squad.',
    status: 'PENDING',
    appliedOn: '18 Oct 2026',
  },
];

export const MOCK_ASSIGNMENTS: AssignmentItem[] = [
  {
    id: 'ASG-1',
    subject: 'CS302 - Algorithms',
    title: 'Problem Set 4: Bellman-Ford & Dijkstra Graph Implementations',
    dueDate: '22 Oct 2026',
    dueTime: '11:59 PM',
    totalMarks: 25,
    status: 'pending',
  },
  {
    id: 'ASG-2',
    subject: 'CS304 - DBMS',
    title: 'Mini Project Submission: University ER Modeling & Normalization (3NF/BCNF)',
    dueDate: '26 Oct 2026',
    dueTime: '05:00 PM',
    totalMarks: 50,
    status: 'pending',
  },
  {
    id: 'ASG-3',
    subject: 'CS310 - Cloud Computing',
    title: 'Lab Exercise: Dockerizing Node.js Microservice & Push to DockerHub',
    dueDate: '15 Oct 2026',
    dueTime: '11:59 PM',
    totalMarks: 20,
    status: 'graded',
    score: 19.5,
  },
];

export const MOCK_NOTICES: CampusNotice[] = [
  {
    id: 'N-1',
    title: 'Mid-Semester Examination Schedule for Odd Semester 2026-27',
    category: 'EXAM',
    date: '18 Oct 2026',
    isPinned: true,
    description: 'Datesheet for B.Tech, MBA, and BBA Mid-Terms released by Office of the Controller of Examinations. Hall tickets will be issued only to students with >= 75% attendance.',
  },
  {
    id: 'N-2',
    title: 'TCS & Deloitte Campus Placement Drive: Registrations Open for 2027 Batch',
    category: 'PLACEMENT',
    date: '17 Oct 2026',
    isPinned: true,
    description: 'Eligible students (CGPA >= 7.0 with no standing backlogs) must fill the training & placement Google Form before 25th October.',
  },
  {
    id: 'N-3',
    title: 'Annual Tech Fest "MANTHAN 2026" - Call for Student Organizers & Leads',
    category: 'EVENT',
    date: '14 Oct 2026',
    isPinned: false,
    description: 'Student Council invites applications for Technical, Sponsorship, and Creative heads for the flagship university fest.',
  },
];

// Faculty Test Data for 1-Click Attendance
export interface FacultyClassStudent {
  id: string;
  rollNo: string;
  name: string;
  currentAttendance: number;
  status: 'PRESENT' | 'ABSENT' | 'ON_DUTY';
}

export const FACULTY_STUDENT_LIST: FacultyClassStudent[] = [
  { id: '1', rollNo: 'DBS/23/CSE/001', name: 'Aaditya Sharma', currentAttendance: 84.2, status: 'PRESENT' },
  { id: '2', rollNo: 'DBS/23/CSE/007', name: 'Aakriti Chauhan', currentAttendance: 91.0, status: 'PRESENT' },
  { id: '3', rollNo: 'DBS/23/CSE/014', name: 'Aman Deep Singh', currentAttendance: 72.4, status: 'ABSENT' },
  { id: '4', rollNo: 'DBS/23/CSE/023', name: 'Ayush Kumar', currentAttendance: 78.5, status: 'PRESENT' },
  { id: '5', rollNo: 'DBS/23/CSE/042', name: 'Harsh Vardhan', currentAttendance: 87.5, status: 'PRESENT' },
  { id: '6', rollNo: 'DBS/23/CSE/051', name: 'Isha Bahuguna', currentAttendance: 68.0, status: 'ABSENT' },
  { id: '7', rollNo: 'DBS/23/CSE/063', name: 'Kartik Joshi', currentAttendance: 75.0, status: 'PRESENT' },
  { id: '8', rollNo: 'DBS/23/CSE/077', name: 'Manish Rawat', currentAttendance: 88.0, status: 'ON_DUTY' },
  { id: '9', rollNo: 'DBS/23/CSE/089', name: 'Naveen Bhatt', currentAttendance: 64.5, status: 'ABSENT' },
  { id: '10', rollNo: 'DBS/23/CSE/102', name: 'Priya Nautiyal', currentAttendance: 94.0, status: 'PRESENT' },
];

// Fee Invoices & Clearance
export interface FeeInvoice {
  id: string;
  invoiceNo: string;
  term: string;
  category: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE';
  receiptDate?: string;
  transactionRef?: string;
}

export const MOCK_FEE_INVOICES: FeeInvoice[] = [
  {
    id: 'FEE-1',
    invoiceNo: 'DBS/2026/FEE/10892',
    term: 'Odd Semester 2026-27 (Sem 5)',
    category: 'Academic Tuition & Computing Lab Fee',
    totalAmount: 92500,
    paidAmount: 92500,
    dueDate: '10 Aug 2026',
    status: 'PAID',
    receiptDate: '08 Aug 2026',
    transactionRef: 'HDFC_NET_9981240182',
  },
  {
    id: 'FEE-2',
    invoiceNo: 'DBS/2026/FEE/10893',
    term: 'Odd Semester 2026-27 (Sem 5)',
    category: 'Hostel Residency & Mess Maintenance',
    totalAmount: 64000,
    paidAmount: 64000,
    dueDate: '15 Aug 2026',
    status: 'PAID',
    receiptDate: '12 Aug 2026',
    transactionRef: 'UPI_PAYTM_34891028',
  },
  {
    id: 'FEE-3',
    invoiceNo: 'DBS/2026/FEE/11540',
    term: 'Odd Semester 2026-27 (Sem 5)',
    category: 'Mid-Term & End-Term Examination Fee',
    totalAmount: 3500,
    paidAmount: 0,
    dueDate: '25 Oct 2026',
    status: 'PENDING',
  },
];

// Gradebook & Internal Assessments
export interface SubjectGrade {
  code: string;
  title: string;
  credits: number;
  ia1: number;       // Max 20
  midTerm: number;   // Max 30
  ia2: number;       // Max 20
  totalInternal: number; // Max 70
  predictedGrade: string;
  gradePoint: number;
}

export const MOCK_EXAM_GRADES: SubjectGrade[] = [
  { code: 'CS302', title: 'Design & Analysis of Algorithms', credits: 4, ia1: 18.5, midTerm: 26.0, ia2: 19.0, totalInternal: 63.5, predictedGrade: 'A+', gradePoint: 9.0 },
  { code: 'CS304', title: 'Database Management Systems', credits: 4, ia1: 17.0, midTerm: 27.5, ia2: 18.0, totalInternal: 62.5, predictedGrade: 'A+', gradePoint: 9.0 },
  { code: 'CS306', title: 'Computer Networks', credits: 4, ia1: 15.0, midTerm: 22.0, ia2: 16.5, totalInternal: 53.5, predictedGrade: 'A', gradePoint: 8.0 },
  { code: 'CS308', title: 'Operating Systems & Architecture', credits: 4, ia1: 14.0, midTerm: 21.0, ia2: 15.0, totalInternal: 50.0, predictedGrade: 'B+', gradePoint: 7.0 },
  { code: 'CS310', title: 'Cloud Computing & DevOps', credits: 4, ia1: 19.0, midTerm: 28.0, ia2: 19.5, totalInternal: 66.5, predictedGrade: 'O (Outstanding)', gradePoint: 10.0 },
  { code: 'CS312', title: 'Machine Learning Foundations', credits: 4, ia1: 18.0, midTerm: 25.5, ia2: 17.5, totalInternal: 61.0, predictedGrade: 'A+', gradePoint: 9.0 },
];

// Hostel Digital Gate Pass
export interface GatePass {
  id: string;
  passNo: string;
  type: 'DAY_OUTING' | 'HOME_VISIT' | 'EMERGENCY';
  destination: string;
  outTime: string;
  expectedInTime: string;
  reason: string;
  status: 'APPROVED' | 'PENDING' | 'CHECKED_OUT' | 'RETURNED';
  wardenName: string;
  qrToken: string;
  issuedDate: string;
}

export const MOCK_GATE_PASSES: GatePass[] = [
  {
    id: 'GP-1',
    passNo: 'GP-2026-8902',
    type: 'DAY_OUTING',
    destination: 'Paltan Bazaar / Pacific Mall Dehradun',
    outTime: 'Today, 04:30 PM',
    expectedInTime: 'Today, 08:30 PM',
    reason: 'Purchasing hardware components for B.Tech CSE IoT project.',
    status: 'APPROVED',
    wardenName: 'Chief Warden: Mr. S.K. Joshi',
    qrToken: 'DBS_GATE_SECURE_AUTH_8902_VALID',
    issuedDate: '19 Oct 2026',
  },
  {
    id: 'GP-2',
    passNo: 'GP-2026-8431',
    type: 'HOME_VISIT',
    destination: 'Home (Delhi NCR)',
    outTime: '11 Oct 2026, 06:00 AM',
    expectedInTime: '14 Oct 2026, 09:00 PM',
    reason: 'Extended weekend family event.',
    status: 'RETURNED',
    wardenName: 'Chief Warden: Mr. S.K. Joshi',
    qrToken: 'DBS_GATE_SECURE_AUTH_8431_EXPIRED',
    issuedDate: '10 Oct 2026',
  },
];
