"use client";

import { FormEvent, useMemo, useState } from "react";
import { letterGrade, percentage, summarizeGrades } from "@/lib/grade-math";

export type GradeRecord = {
  id: number;
  rollNo: string;
  studentName: string;
  className: string;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: string;
  percentage: number;
  letterGrade: string;
};

type FormState = {
  rollNo: string;
  studentName: string;
  className: string;
  subject: string;
  score: string;
  maxScore: string;
};

type Notice = {
  tone: "good" | "bad";
  text: string;
};

const emptyForm: FormState = {
  rollNo: "",
  studentName: "",
  className: "Grade 10",
  subject: "Mathematics",
  score: "",
  maxScore: "100",
};

const subjectOptions = ["Mathematics", "Science", "English", "History", "Computer Science", "Geography", "Art"];
const classOptions = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];

function normalizeGrade(grade: GradeRecord): GradeRecord {
  const percent = percentage(grade.score, grade.maxScore);

  return {
    ...grade,
    createdAt: new Date(grade.createdAt).toISOString(),
    percentage: percent,
    letterGrade: letterGrade(percent),
  };
}

function downloadCsv(grades: GradeRecord[]) {
  const header = ["Roll No", "Student", "Class", "Subject", "Score", "Max Score", "Percent", "Letter"];
  const lines = grades.map((grade) => [
    grade.rollNo,
    grade.studentName,
    grade.className,
    grade.subject,
    String(grade.score),
    String(grade.maxScore),
    String(grade.percentage),
    grade.letterGrade,
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((value) => `"${value.replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-grade-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function GradeTracker({ initialGrades }: { initialGrades: GradeRecord[] }) {
  const [grades, setGrades] = useState(initialGrades);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keepStudent, setKeepStudent] = useState(true);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("All classes");
  const [sort, setSort] = useState("name");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const report = useMemo(() => summarizeGrades(grades), [grades]);
  const classChoices = useMemo(
    () => Array.from(new Set([...classOptions, ...grades.map((grade) => grade.className)])).sort(),
    [grades],
  );
  const visibleGrades = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = grades.filter((grade) => {
      const haystack = `${grade.studentName} ${grade.rollNo} ${grade.subject} ${grade.className}`.toLowerCase();
      const matchesQuery = !needle || haystack.includes(needle);
      const matchesClass = classFilter === "All classes" || grade.className === classFilter;
      return matchesQuery && matchesClass;
    });

    return filtered.sort((left, right) => {
      if (sort === "percent") return right.percentage - left.percentage || left.studentName.localeCompare(right.studentName);
      if (sort === "subject") return left.subject.localeCompare(right.subject) || left.studentName.localeCompare(right.studentName);
      return left.studentName.localeCompare(right.studentName) || left.subject.localeCompare(right.subject);
    });
  }, [grades, query, classFilter, sort]);
  const filteredSummary = useMemo(() => summarizeGrades(visibleGrades).summary, [visibleGrades]);
  const needsAttention = report.students.filter((student) => student.average < 60);

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function beginEdit(grade: GradeRecord) {
    setEditingId(grade.id);
    setForm({
      rollNo: grade.rollNo,
      studentName: grade.studentName,
      className: grade.className,
      subject: grade.subject,
      score: String(grade.score),
      maxScore: String(grade.maxScore),
    });
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    const payload = {
      rollNo: form.rollNo,
      studentName: form.studentName,
      className: form.className,
      subject: form.subject,
      score: Number(form.score),
      maxScore: Number(form.maxScore),
    };

    try {
      const response = await fetch(editingId ? `/api/grades/${editingId}` : "/api/grades", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { grade?: GradeRecord; error?: string };

      if (!response.ok || !result.grade) {
        throw new Error(result.error ?? "Unable to save this grade.");
      }

      const saved = normalizeGrade(result.grade);
      setGrades((current) =>
        editingId ? current.map((grade) => (grade.id === editingId ? saved : grade)) : [saved, ...current],
      );
      setNotice({
        tone: "good",
        text: editingId ? `${saved.studentName}'s ${saved.subject} grade was updated.` : `${saved.studentName}'s grade was saved to PostgreSQL.`,
      });
      setEditingId(null);
      setForm(keepStudent && !editingId ? { ...form, subject: "Mathematics", score: "" } : emptyForm);
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Unable to save this grade." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(grade: GradeRecord) {
    if (!window.confirm(`Delete ${grade.studentName}'s ${grade.subject} grade?`)) return;

    setDeletingId(grade.id);
    setNotice(null);

    try {
      const response = await fetch(`/api/grades/${grade.id}`, { method: "DELETE" });
      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete this grade.");
      }

      setGrades((current) => current.filter((item) => item.id !== grade.id));
      if (editingId === grade.id) cancelEdit();
      setNotice({ tone: "good", text: "Grade removed from the SQL gradebook." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Unable to delete this grade." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="stat-grid" aria-label="Class statistics">
        <article className="stat-card pine">
          <span>Class average</span>
          <strong>{report.summary.average}%</strong>
        </article>
        <article className="stat-card">
          <span>Highest score</span>
          <strong>{report.summary.highest}%</strong>
        </article>
        <article className="stat-card">
          <span>Lowest score</span>
          <strong>{report.summary.lowest}%</strong>
        </article>
        <article className="stat-card">
          <span>Students / records</span>
          <strong>{report.summary.studentCount}/{report.summary.totalRecords}</strong>
        </article>
      </section>

      <section className="layout">
        <form className="panel entry-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{editingId ? "Edit record" : "New record"}</span>
              <h2>{editingId ? "Update a grade" : "Add a grade"}</h2>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Roll number</span>
              <input required name="rollNo" value={form.rollNo} onChange={(event) => updateField("rollNo", event.target.value)} placeholder="R-1042" />
            </label>
            <label className="field">
              <span>Class</span>
              <input required list="class-options" value={form.className} onChange={(event) => updateField("className", event.target.value)} />
            </label>
            <label className="field wide">
              <span>Student name</span>
              <input required value={form.studentName} onChange={(event) => updateField("studentName", event.target.value)} placeholder="Student name" />
            </label>
            <label className="field wide">
              <span>Subject</span>
              <input required list="subject-options" value={form.subject} onChange={(event) => updateField("subject", event.target.value)} />
            </label>
            <label className="field">
              <span>Score</span>
              <input required type="number" min={0} max={1000} value={form.score} onChange={(event) => updateField("score", event.target.value)} placeholder="85" />
            </label>
            <label className="field">
              <span>Max score</span>
              <input required type="number" min={1} max={1000} value={form.maxScore} onChange={(event) => updateField("maxScore", event.target.value)} />
            </label>
          </div>
          <datalist id="class-options">
            {classChoices.map((className) => <option key={className} value={className} />)}
          </datalist>
          <datalist id="subject-options">
            {subjectOptions.map((subject) => <option key={subject} value={subject} />)}
          </datalist>
          {!editingId ? (
            <label className="check-row">
              <input type="checkbox" checked={keepStudent} onChange={(event) => setKeepStudent(event.target.checked)} />
              Keep student details for another subject
            </label>
          ) : null}
          <div className="button-row">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Add grade"}
            </button>
            {editingId ? (
              <button className="ghost-button" type="button" onClick={cancelEdit}>Cancel</button>
            ) : null}
          </div>
          {notice ? <p className={`status ${notice.tone}`}>{notice.text}</p> : null}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Student summary</span>
              <h2>Averages by student</h2>
            </div>
            <p>{report.summary.passing} passing marks</p>
          </div>
          {needsAttention.length > 0 ? (
            <p className="attention">Needs attention: {needsAttention.map((student) => `${student.studentName} (${student.average}%)`).join(", ")}.</p>
          ) : (
            <p className="attention">Every student average is currently at or above 60%.</p>
          )}
          <div className="student-grid" style={{ marginTop: 14 }}>
            {report.students.map((student, index) => (
              <article className="student-card" key={student.key}>
                <header>
                  <div>
                    <h3>{student.studentName}</h3>
                    <p>{student.rollNo} · {student.className}</p>
                  </div>
                  <span className="rank">{index + 1}</span>
                </header>
                <div className="meter" aria-hidden="true">
                  <span style={{ width: `${Math.max(0, Math.min(student.average, 100))}%` }} />
                </div>
                <p>Average {student.average}% · High {student.highest}% · Low {student.lowest}%</p>
                <p>{student.subjects.join(", ")}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="ledger-heading panel-heading">
          <div>
            <span className="eyebrow">Grade ledger</span>
            <h2>All recorded marks</h2>
          </div>
          <div className="legend">
            {["A", "B", "C", "D", "F"].map((mark) => <span key={mark} className={`mark mark-${mark.toLowerCase()}`}>{mark}</span>)}
          </div>
        </div>
        <div className="search-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, roll number, class, or subject" aria-label="Search grades" />
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filter by class">
            <option>All classes</option>
            {classChoices.map((className) => <option key={className}>{className}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort grades">
            <option value="name">Sort by name</option>
            <option value="percent">Sort by percent</option>
            <option value="subject">Sort by subject</option>
          </select>
          <button className="ghost-button" type="button" onClick={() => downloadCsv(visibleGrades)}>Download CSV</button>
        </div>
        <p className="table-note">
          Showing {visibleGrades.length} of {grades.length} records.
          {visibleGrades.length !== grades.length ? ` Filtered average ${filteredSummary.average}%, high ${filteredSummary.highest}%, low ${filteredSummary.lowest}%.` : " Calculations use an array of grade records returned by SQL."}
        </p>
        {visibleGrades.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Percent</th>
                  <th>Grade</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleGrades.map((grade) => (
                  <tr key={grade.id}>
                    <td>
                      <div className="person">
                        <strong>{grade.studentName}</strong>
                        <span>{grade.rollNo} · {grade.className}</span>
                      </div>
                    </td>
                    <td>{grade.subject}</td>
                    <td>
                      <strong>{grade.score}</strong>
                      <div className="score-sub">out of {grade.maxScore}</div>
                    </td>
                    <td>{grade.percentage}%</td>
                    <td><span className={`mark mark-${grade.letterGrade.toLowerCase()}`}>{grade.letterGrade}</span></td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => beginEdit(grade)}>Edit</button>
                        <button className="delete" type="button" onClick={() => handleDelete(grade)} disabled={deletingId === grade.id}>
                          {deletingId === grade.id ? "Deleting" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-copy">No marks match this search. Add a grade or clear the filter.</p>
        )}
      </section>
    </>
  );
}
