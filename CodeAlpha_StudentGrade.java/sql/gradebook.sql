-- Northbridge Gradebook
-- PostgreSQL schema and summary queries used by the React app,
-- the HTML/CSS/JS page, and the Java console program.

CREATE TABLE IF NOT EXISTS student_grades (
  id serial PRIMARY KEY,
  roll_no text NOT NULL DEFAULT 'N/A',
  student_name text NOT NULL,
  class_name text NOT NULL DEFAULT 'Grade 10',
  subject text NOT NULL,
  score integer NOT NULL,
  max_score integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Class average, highest, and lowest percentages.
SELECT
  COUNT(*)::int AS total_records,
  COUNT(DISTINCT roll_no)::int AS student_count,
  ROUND(AVG(score::numeric / NULLIF(max_score, 0) * 100), 1) AS average_percent,
  ROUND(MAX(score::numeric / NULLIF(max_score, 0) * 100), 1) AS highest_percent,
  ROUND(MIN(score::numeric / NULLIF(max_score, 0) * 100), 1) AS lowest_percent
FROM student_grades;

-- One summary row for every student.
SELECT
  roll_no,
  student_name,
  class_name,
  COUNT(*)::int AS assessments,
  ROUND(AVG(score::numeric / NULLIF(max_score, 0) * 100), 1) AS average_percent,
  ROUND(MAX(score::numeric / NULLIF(max_score, 0) * 100), 1) AS highest_percent,
  ROUND(MIN(score::numeric / NULLIF(max_score, 0) * 100), 1) AS lowest_percent
FROM student_grades
GROUP BY roll_no, student_name, class_name
ORDER BY average_percent DESC, student_name;
