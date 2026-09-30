export type ScoreLike = {
  rollNo: string;
  studentName: string;
  className: string;
  subject: string;
  score: number;
  maxScore: number;
};

export type ClassSummary = {
  totalRecords: number;
  studentCount: number;
  average: number;
  highest: number;
  lowest: number;
  passing: number;
};

export type StudentSummary = {
  key: string;
  rollNo: string;
  studentName: string;
  className: string;
  subjects: string[];
  average: number;
  highest: number;
  lowest: number;
};

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function percentage(score: number, maxScore: number) {
  if (maxScore <= 0) return 0;
  return round1((score / maxScore) * 100);
}

export function letterGrade(value: number) {
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "F";
}

export function summarizeGrades(grades: ScoreLike[]) {
  const percentages = grades.map((grade) => percentage(grade.score, grade.maxScore));
  const total = percentages.reduce((sum, value) => sum + value, 0);
  const groups = new Map<string, ScoreLike[]>();

  for (const grade of grades) {
    const key = `${grade.rollNo}::${grade.studentName.toLowerCase()}`;
    const current = groups.get(key) ?? [];
    current.push(grade);
    groups.set(key, current);
  }

  const students: StudentSummary[] = Array.from(groups.entries())
    .map(([key, items]) => {
      const studentPercentages = items.map((item) => percentage(item.score, item.maxScore));
      const studentTotal = studentPercentages.reduce((sum, value) => sum + value, 0);

      return {
        key,
        rollNo: items[0]?.rollNo ?? "",
        studentName: items[0]?.studentName ?? "",
        className: items[0]?.className ?? "",
        subjects: items.map((item) => item.subject),
        average: studentPercentages.length ? round1(studentTotal / studentPercentages.length) : 0,
        highest: studentPercentages.length ? Math.max(...studentPercentages) : 0,
        lowest: studentPercentages.length ? Math.min(...studentPercentages) : 0,
      };
    })
    .sort((left, right) => right.average - left.average || left.studentName.localeCompare(right.studentName));

  return {
    summary: {
      totalRecords: grades.length,
      studentCount: students.length,
      average: percentages.length ? round1(total / percentages.length) : 0,
      highest: percentages.length ? Math.max(...percentages) : 0,
      lowest: percentages.length ? Math.min(...percentages) : 0,
      passing: percentages.filter((value) => value >= 60).length,
    } satisfies ClassSummary,
    students,
  };
}
