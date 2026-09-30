import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { studentGrades } from "@/db/schema";
import { letterGrade, percentage, summarizeGrades } from "@/lib/grade-math";

export type GradeInput = {
  rollNo: string;
  studentName: string;
  className: string;
  subject: string;
  score: number;
  maxScore: number;
};

const demoGrades: GradeInput[] = [
  { rollNo: "R-1042", studentName: "Aarav Sharma", className: "Grade 10", subject: "Mathematics", score: 92, maxScore: 100 },
  { rollNo: "R-1042", studentName: "Aarav Sharma", className: "Grade 10", subject: "Science", score: 88, maxScore: 100 },
  { rollNo: "R-1042", studentName: "Aarav Sharma", className: "Grade 10", subject: "English", score: 81, maxScore: 100 },
  { rollNo: "R-1108", studentName: "Mia Johnson", className: "Grade 10", subject: "Mathematics", score: 76, maxScore: 100 },
  { rollNo: "R-1108", studentName: "Mia Johnson", className: "Grade 10", subject: "Science", score: 84, maxScore: 100 },
  { rollNo: "R-0988", studentName: "Noah Williams", className: "Grade 11", subject: "English", score: 68, maxScore: 100 },
  { rollNo: "R-0988", studentName: "Noah Williams", className: "Grade 11", subject: "History", score: 74, maxScore: 100 },
  { rollNo: "R-1215", studentName: "Sophia Chen", className: "Grade 11", subject: "Computer Science", score: 97, maxScore: 100 },
  { rollNo: "R-1215", studentName: "Sophia Chen", className: "Grade 11", subject: "Mathematics", score: 94, maxScore: 100 },
  { rollNo: "R-0874", studentName: "Liam Patel", className: "Grade 9", subject: "Science", score: 59, maxScore: 100 },
  { rollNo: "R-0874", studentName: "Liam Patel", className: "Grade 9", subject: "Mathematics", score: 63, maxScore: 100 },
];

let setupPromise: Promise<void> | null = null;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function toInt(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

export function parseGradeInput(payload: {
  rollNo?: unknown;
  studentName?: unknown;
  className?: unknown;
  subject?: unknown;
  score?: unknown;
  maxScore?: unknown;
}) {
  const rollNo = clean(payload.rollNo).toUpperCase();
  const studentName = clean(payload.studentName);
  const className = clean(payload.className);
  const subject = clean(payload.subject);
  const score = toInt(payload.score);
  const maxScore = toInt(payload.maxScore);

  if (!/^[A-Z0-9-]{2,20}$/.test(rollNo)) {
    return { error: "Roll number should be 2–20 letters, numbers, or hyphens." };
  }

  if (studentName.length < 2 || studentName.length > 80) {
    return { error: "Student name must be between 2 and 80 characters." };
  }

  if (className.length < 2 || className.length > 40) {
    return { error: "Class must be between 2 and 40 characters." };
  }

  if (subject.length < 2 || subject.length > 60) {
    return { error: "Subject must be between 2 and 60 characters." };
  }

  if (!Number.isInteger(score) || score < 0 || score > 1000) {
    return { error: "Score must be a whole number from 0 to 1000." };
  }

  if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) {
    return { error: "Max score must be a whole number from 1 to 1000." };
  }

  if (score > maxScore) {
    return { error: "Score cannot be greater than the max score." };
  }

  return {
    data: { rollNo, studentName, className, subject, score, maxScore } satisfies GradeInput,
  };
}

function decorate<T extends { score: number; maxScore: number }>(grade: T) {
  const percent = percentage(grade.score, grade.maxScore);

  return {
    ...grade,
    percentage: percent,
    letterGrade: letterGrade(percent),
  };
}

async function ensureGradeSchemaAndSeed() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_grades (
      id serial PRIMARY KEY,
      roll_no text NOT NULL DEFAULT 'N/A',
      student_name text NOT NULL,
      class_name text NOT NULL DEFAULT 'Grade 10',
      subject text NOT NULL,
      score integer NOT NULL,
      max_score integer NOT NULL DEFAULT 100,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE student_grades
    ADD COLUMN IF NOT EXISTS roll_no text NOT NULL DEFAULT 'N/A'
  `);
  await db.execute(sql`
    ALTER TABLE student_grades
    ADD COLUMN IF NOT EXISTS class_name text NOT NULL DEFAULT 'Grade 10'
  `);

  const existing = await db.select({ rollNo: studentGrades.rollNo }).from(studentGrades);
  const needsDemo = existing.length === 0 || existing.every((row) => row.rollNo === "N/A" || row.rollNo === "UNASSIGNED");

  if (needsDemo) {
    await db.delete(studentGrades);
    await db.insert(studentGrades).values(demoGrades);
  }
}

export function prepareGradeData() {
  setupPromise ??= ensureGradeSchemaAndSeed();
  return setupPromise;
}

export async function getGradeReport() {
  await prepareGradeData();

  const grades = await db
    .select()
    .from(studentGrades)
    .orderBy(asc(studentGrades.studentName), asc(studentGrades.subject), desc(studentGrades.createdAt));

  const decorated = grades.map(decorate);
  const { summary, students } = summarizeGrades(decorated);

  return { grades: decorated, summary, students };
}

export async function addStudentGrade(input: GradeInput) {
  await prepareGradeData();
  const [created] = await db.insert(studentGrades).values(input).returning();
  return decorate(created);
}

export async function updateStudentGrade(id: number, input: GradeInput) {
  await prepareGradeData();
  const [updated] = await db
    .update(studentGrades)
    .set(input)
    .where(eq(studentGrades.id, id))
    .returning();

  return updated ? decorate(updated) : null;
}

export async function deleteStudentGrade(id: number) {
  await prepareGradeData();
  const deleted = await db.delete(studentGrades).where(eq(studentGrades.id, id)).returning({ id: studentGrades.id });
  return deleted.length > 0;
}
