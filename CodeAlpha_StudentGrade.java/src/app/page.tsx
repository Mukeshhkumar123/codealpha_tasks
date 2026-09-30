import { GradeTracker, type GradeRecord } from "./components/grade-tracker";
import { getGradeReport } from "@/lib/grades";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const report = await getGradeReport();
  const initialGrades: GradeRecord[] = report.grades.map((grade) => ({
    ...grade,
    createdAt: grade.createdAt.toISOString(),
  }));

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#ledger">
          <span className="brand-mark">NB</span>
          <span>
            <small>Northbridge Academy</small>
            <strong>Student Gradebook</strong>
          </span>
        </a>
        <nav className="header-links" aria-label="Project files">
          <a href="/gradebook.html">HTML / CSS / JS</a>
          <a href="/StudentGradeTracker.java">Java program</a>
          <a href="/api/grades">SQL API</a>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">Basic grade tracker</span>
          <h1>Record marks, compare students, and print a class report.</h1>
          <p className="lede">
            Add grades, edit mistakes, and delete old records. Average, highest, and lowest scores are calculated from the grade array stored in PostgreSQL.
          </p>
          <div className="tech-row" aria-label="Technologies used">
            <span>HTML</span>
            <span>CSS</span>
            <span>JavaScript</span>
            <span>React</span>
            <span>Java</span>
            <span>SQL</span>
          </div>
        </div>
        <figure className="cover-card">
          <img src="/images/gradebook-cover.jpg" alt="Open clothbound gradebook on a wooden desk" />
          <figcaption>
            <strong>Ms. Vargas · Term 2</strong>
            <p>{report.summary.studentCount} students currently on the roll.</p>
          </figcaption>
        </figure>
      </section>

      <main className="workspace" id="ledger">
        <GradeTracker initialGrades={initialGrades} />
      </main>

      <footer className="site-footer">
        <p>React interface and Node.js API routes write to the student_grades SQL table.</p>
        <p>Java console companion: javac StudentGradeTracker.java && java StudentGradeTracker</p>
      </footer>
    </>
  );
}
