import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const studentGrades = pgTable("student_grades", {
  id: serial("id").primaryKey(),
  rollNo: text("roll_no").notNull().default("N/A"),
  studentName: text("student_name").notNull(),
  className: text("class_name").notNull().default("Grade 10"),
  subject: text("subject").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
