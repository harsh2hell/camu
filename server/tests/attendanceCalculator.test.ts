import { describe, it, expect } from 'vitest';
import {
  calculateSubjectAttendance,
  calculateOverallAttendance,
} from '../src/utils/attendanceCalculator.js';

describe('Academic Attendance Calculation Policy Suite', () => {
  const dummySubject = {
    code: 'CS302',
    title: 'Design & Analysis of Algorithms',
    faculty: 'Dr. Rajesh Sharma',
  };

  it('1. should calculate 100% attendance when all classes are present', () => {
    const records = Array(10).fill({ status: 'PRESENT' as const });
    const result = calculateSubjectAttendance(dummySubject, records);

    expect(result.conducted).toBe(10);
    expect(result.attended).toBe(10);
    expect(result.percentage).toBe(100.0);
    expect(result.status).toBe('safe');
    expect(result.bunkCapacity).toBe(3); // (10 - 7.5)/0.75 = 2.5/0.75 = 3
    expect(result.classesToRecover).toBe(0);
  });

  it('2. should credit ON_DUTY (OD) towards attended count', () => {
    // 8 PRESENT, 2 ON_DUTY -> 10 attended out of 10 conducted
    const records = [
      ...Array(8).fill({ status: 'PRESENT' as const }),
      ...Array(2).fill({ status: 'ON_DUTY' as const }),
    ];
    const result = calculateSubjectAttendance(dummySubject, records);

    expect(result.conducted).toBe(10);
    expect(result.attended).toBe(10);
    expect(result.onDuty).toBe(2);
    expect(result.percentage).toBe(100.0);
    expect(result.status).toBe('safe');
  });

  it('3. should credit MEDICAL_LEAVE and EXEMPTED toward attendance', () => {
    const records = [
      { status: 'PRESENT' as const },
      { status: 'MEDICAL_LEAVE' as const },
      { status: 'EXEMPTED' as const },
      { status: 'ABSENT' as const },
    ];
    const result = calculateSubjectAttendance(dummySubject, records);

    expect(result.conducted).toBe(4);
    expect(result.attended).toBe(3);
    expect(result.absent).toBe(1);
    expect(result.percentage).toBe(75.0);
    expect(result.status).toBe('safe');
  });

  it('4. should correctly classify warning threshold (65.0% - 74.9%)', () => {
    // 7 attended out of 10 conducted = 70.0%
    const records = [
      ...Array(7).fill({ status: 'PRESENT' as const }),
      ...Array(3).fill({ status: 'ABSENT' as const }),
    ];
    const result = calculateSubjectAttendance(dummySubject, records);

    expect(result.percentage).toBe(70.0);
    expect(result.status).toBe('warning');
    expect(result.bunkCapacity).toBe(0);
    expect(result.classesToRecover).toBe(2); // (0.75*10 - 7)/0.25 = 0.5/0.25 = 2 classes
  });

  it('5. should correctly classify danger/debarment threshold (< 65.0%)', () => {
    // 6 attended out of 10 conducted = 60.0%
    const records = [
      ...Array(6).fill({ status: 'PRESENT' as const }),
      ...Array(4).fill({ status: 'ABSENT' as const }),
    ];
    const result = calculateSubjectAttendance(dummySubject, records);

    expect(result.percentage).toBe(60.0);
    expect(result.status).toBe('danger');
    expect(result.classesToRecover).toBe(6); // (0.75*10 - 6)/0.25 = 1.5/0.25 = 6 classes
  });

  it('6. should calculate zero conducted classes without NaN', () => {
    const result = calculateSubjectAttendance(dummySubject, []);

    expect(result.conducted).toBe(0);
    expect(result.attended).toBe(0);
    expect(result.percentage).toBe(100.0);
    expect(result.status).toBe('safe');
    expect(result.bunkCapacity).toBe(0);
    expect(result.classesToRecover).toBe(0);
  });

  it('7. should calculate aggregate overall attendance across multiple subjects', () => {
    const sub1 = calculateSubjectAttendance(
      { code: 'CS302', title: 'Algorithms', faculty: 'Dr. Sharma' },
      [...Array(28).fill({ status: 'PRESENT' as const }), ...Array(4).fill({ status: 'ABSENT' as const })] // 28/32 = 87.5%
    );
    const sub2 = calculateSubjectAttendance(
      { code: 'CS304', title: 'DBMS', faculty: 'Prof. Sen' },
      [...Array(20).fill({ status: 'PRESENT' as const }), ...Array(10).fill({ status: 'ABSENT' as const })] // 20/30 = 66.7%
    );

    const overall = calculateOverallAttendance([sub1, sub2]);

    expect(overall.totalAttended).toBe(48);
    expect(overall.totalConducted).toBe(62);
    // 48/62 = 77.419% -> 77.4%
    expect(overall.overallPercentage).toBe(77.4);
    expect(overall.isExamEligible).toBe(true);
    expect(overall.status).toBe('safe');
  });
});
