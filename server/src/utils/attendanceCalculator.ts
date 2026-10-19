import type { AttendanceStatus } from '@prisma/client';

export interface SubjectAttendanceRecord {
  status: AttendanceStatus;
}

export interface SubjectAttendanceStats {
  code: string;
  title: string;
  faculty: string;
  attended: number;
  conducted: number;
  onDuty: number;
  absent: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  bunkCapacity: number;     // Classes student can miss while staying >= 75% (0 if below 75%)
  classesToRecover: number; // Classes student must attend to reach 75% (0 if >= 75%)
}

export interface OverallAttendanceSummary {
  totalAttended: number;
  totalConducted: number;
  overallPercentage: number;
  status: 'safe' | 'warning' | 'danger';
  isExamEligible: boolean;
  subjects: SubjectAttendanceStats[];
}

/**
 * Calculates attendance statistics for a single subject based on recorded session statuses.
 * 
 * Policy:
 * - PRESENT: Attended = 1, Conducted = 1
 * - ON_DUTY: Attended = 1, Conducted = 1, OD = 1
 * - MEDICAL_LEAVE / EXEMPTED: Attended = 1, Conducted = 1
 * - ABSENT: Attended = 0, Conducted = 1
 * 
 * Thresholds:
 * - >= 75.0%: safe
 * - 65.0% to 74.9%: warning
 * - < 65.0%: danger
 */
export function calculateSubjectAttendance(
  subjectInfo: { code: string; title: string; faculty: string },
  records: Array<{ status: AttendanceStatus }>
): SubjectAttendanceStats {
  let attended = 0;
  let conducted = 0;
  let onDuty = 0;
  let absent = 0;

  for (const record of records) {
    conducted += 1;
    switch (record.status) {
      case 'PRESENT':
        attended += 1;
        break;
      case 'ON_DUTY':
        attended += 1;
        onDuty += 1;
        break;
      case 'MEDICAL_LEAVE':
      case 'EXEMPTED':
        attended += 1;
        break;
      case 'ABSENT':
        absent += 1;
        break;
      default:
        absent += 1;
        break;
    }
  }

  const rawPercent = conducted > 0 ? (attended / conducted) * 100 : 100.0;
  const percentage = Math.round(rawPercent * 10) / 10;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percentage < 65.0) {
    status = 'danger';
  } else if (percentage < 75.0) {
    status = 'warning';
  }

  // Bunk capacity vs recovery calculation
  let bunkCapacity = 0;
  let classesToRecover = 0;

  if (conducted === 0) {
    bunkCapacity = 0;
    classesToRecover = 0;
  } else if (percentage >= 75.0) {
    // Formula: floor((attended - 0.75 * conducted) / 0.75)
    bunkCapacity = Math.max(0, Math.floor((attended - 0.75 * conducted) / 0.75));
  } else {
    // Formula: ceil((0.75 * conducted - attended) / 0.25)
    classesToRecover = Math.max(0, Math.ceil((0.75 * conducted - attended) / 0.25));
  }

  return {
    code: subjectInfo.code,
    title: subjectInfo.title,
    faculty: subjectInfo.faculty,
    attended,
    conducted,
    onDuty,
    absent,
    percentage,
    status,
    bunkCapacity,
    classesToRecover,
  };
}

/**
 * Calculates aggregate university attendance summary across all enrolled subjects
 */
export function calculateOverallAttendance(
  subjects: SubjectAttendanceStats[]
): OverallAttendanceSummary {
  let totalAttended = 0;
  let totalConducted = 0;

  for (const sub of subjects) {
    totalAttended += sub.attended;
    totalConducted += sub.conducted;
  }

  const rawPercent = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 100.0;
  const overallPercentage = Math.round(rawPercent * 10) / 10;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (overallPercentage < 65.0) {
    status = 'danger';
  } else if (overallPercentage < 75.0) {
    status = 'warning';
  }

  return {
    totalAttended,
    totalConducted,
    overallPercentage,
    status,
    isExamEligible: overallPercentage >= 75.0,
    subjects,
  };
}
