import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Scanner;

/**
 * Console student grade tracker.
 *
 * Compile: javac StudentGradeTracker.java
 * Run:     java StudentGradeTracker
 *
 * Grades are kept in an ArrayList for calculations and persisted with SQL
 * through psql into the same PostgreSQL student_grades table used by the web app.
 */
public class StudentGradeTracker {
    static class Grade {
        int id;
        String rollNo;
        String studentName;
        String className;
        String subject;
        int score;
        int maxScore;

        double percentage() {
            if (maxScore == 0) {
                return 0;
            }
            return Math.round((score * 1000.0 / maxScore)) / 10.0;
        }

        String letter() {
            double value = percentage();
            if (value >= 90) return "A";
            if (value >= 80) return "B";
            if (value >= 70) return "C";
            if (value >= 60) return "D";
            return "F";
        }
    }

    private static final Scanner scanner = new Scanner(System.in);
    private static final ArrayList<Grade> grades = new ArrayList<Grade>();
    private static final String DELIMITER = "\u001f";
    private static String databaseUrl = System.getenv("DATABASE_URL");

    public static void main(String[] args) {
        if (databaseUrl == null || databaseUrl.trim().isEmpty()) {
            databaseUrl = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
        }

        try {
            ensureTable();
            reload();
            System.out.println("Northbridge Student Grade Tracker");
            System.out.println("Java ArrayList calculations with SQL storage.");

            boolean running = true;
            while (running) {
                printMenu();
                String choice = scanner.nextLine().trim();
                if ("1".equals(choice)) {
                    addGrade();
                } else if ("2".equals(choice)) {
                    printReport();
                } else if ("3".equals(choice)) {
                    printStatistics();
                } else if ("4".equals(choice)) {
                    searchStudents();
                } else if ("5".equals(choice)) {
                    updateGrade();
                } else if ("6".equals(choice)) {
                    deleteGrade();
                } else if ("7".equals(choice)) {
                    reload();
                    System.out.println("Reloaded " + grades.size() + " grade records from SQL.");
                } else if ("8".equals(choice)) {
                    running = false;
                } else {
                    System.out.println("Choose a number from 1 to 8.");
                }
            }
        } catch (Exception error) {
            System.out.println("Could not use the SQL gradebook: " + error.getMessage());
        }

        System.out.println("Goodbye.");
    }

    private static void printMenu() {
        System.out.println();
        System.out.println("1. Add student grade");
        System.out.println("2. Display summary report");
        System.out.println("3. Show average, highest, and lowest");
        System.out.println("4. Search students");
        System.out.println("5. Update a grade");
        System.out.println("6. Delete a grade");
        System.out.println("7. Reload from SQL");
        System.out.println("8. Exit");
        System.out.print("Choose an option: ");
    }

    private static void ensureTable() throws IOException, InterruptedException {
        runSql(
            "CREATE TABLE IF NOT EXISTS student_grades ("
                + "id serial PRIMARY KEY, "
                + "roll_no text NOT NULL DEFAULT 'N/A', "
                + "student_name text NOT NULL, "
                + "class_name text NOT NULL DEFAULT 'Grade 10', "
                + "subject text NOT NULL, "
                + "score integer NOT NULL, "
                + "max_score integer NOT NULL DEFAULT 100, "
                + "created_at timestamptz NOT NULL DEFAULT now())"
        );
    }

    private static void reload() throws IOException, InterruptedException {
        String output = runSql(
            "SELECT id, roll_no, student_name, class_name, subject, score, max_score "
                + "FROM student_grades ORDER BY student_name, subject, id"
        );
        grades.clear();

        String[] lines = output.split("\\R");
        for (String line : lines) {
            if (line.trim().isEmpty()) {
                continue;
            }
            String[] parts = line.split(DELIMITER, -1);
            if (parts.length < 7) {
                continue;
            }
            Grade grade = new Grade();
            grade.id = Integer.parseInt(parts[0]);
            grade.rollNo = parts[1];
            grade.studentName = parts[2];
            grade.className = parts[3];
            grade.subject = parts[4];
            grade.score = Integer.parseInt(parts[5]);
            grade.maxScore = Integer.parseInt(parts[6]);
            grades.add(grade);
        }
    }

    private static void addGrade() throws IOException, InterruptedException {
        Grade grade = readGradeFromInput();
        if (grade == null) {
            return;
        }

        runSql(
            "INSERT INTO student_grades (roll_no, student_name, class_name, subject, score, max_score) VALUES ("
                + quote(grade.rollNo) + ", "
                + quote(grade.studentName) + ", "
                + quote(grade.className) + ", "
                + quote(grade.subject) + ", "
                + grade.score + ", "
                + grade.maxScore + ")"
        );
        reload();
        System.out.println("Grade saved to SQL and loaded into the ArrayList.");
    }

    private static void updateGrade() throws IOException, InterruptedException {
        printReport();
        int id = readInt("Grade ID to update: ");
        Grade existing = findById(id);
        if (existing == null) {
            System.out.println("No grade found with that ID.");
            return;
        }

        Grade grade = readGradeFromInput();
        if (grade == null) {
            return;
        }

        runSql(
            "UPDATE student_grades SET "
                + "roll_no = " + quote(grade.rollNo) + ", "
                + "student_name = " + quote(grade.studentName) + ", "
                + "class_name = " + quote(grade.className) + ", "
                + "subject = " + quote(grade.subject) + ", "
                + "score = " + grade.score + ", "
                + "max_score = " + grade.maxScore + " "
                + "WHERE id = " + id
        );
        reload();
        System.out.println("Grade updated.");
    }

    private static void deleteGrade() throws IOException, InterruptedException {
        printReport();
        int id = readInt("Grade ID to delete: ");
        if (findById(id) == null) {
            System.out.println("No grade found with that ID.");
            return;
        }

        runSql("DELETE FROM student_grades WHERE id = " + id);
        reload();
        System.out.println("Grade deleted.");
    }

    private static void searchStudents() {
        System.out.print("Search name, roll number, class, or subject: ");
        String needle = scanner.nextLine().trim().toLowerCase();
        ArrayList<Grade> matches = new ArrayList<Grade>();

        for (Grade grade : grades) {
            String haystack = (grade.studentName + " " + grade.rollNo + " " + grade.className + " " + grade.subject).toLowerCase();
            if (haystack.contains(needle)) {
                matches.add(grade);
            }
        }

        if (matches.isEmpty()) {
            System.out.println("No matching grades.");
            return;
        }

        printGrades(matches);
        printStatistics(matches);
    }

    private static void printReport() {
        if (grades.isEmpty()) {
            System.out.println("No grades stored yet.");
            return;
        }

        System.out.println();
        System.out.println("================ Student Summary Report ================");
        printGrades(grades);
        printStatistics(grades);
        printStudentAverages();
    }

    private static void printStatistics() {
        printStatistics(grades);
    }

    private static void printGrades(ArrayList<Grade> rows) {
        System.out.printf("%-6s %-10s %-18s %-12s %-18s %-10s %-8s %-6s%n",
            "ID", "Roll", "Student", "Class", "Subject", "Score", "Percent", "Grade");
        for (Grade grade : rows) {
            System.out.printf("%-6d %-10s %-18s %-12s %-18s %-10s %-7.1f%% %-6s%n",
                grade.id,
                grade.rollNo,
                grade.studentName,
                grade.className,
                grade.subject,
                grade.score + "/" + grade.maxScore,
                grade.percentage(),
                grade.letter());
        }
    }

    private static void printStatistics(ArrayList<Grade> rows) {
        if (rows.isEmpty()) {
            System.out.println("No scores available.");
            return;
        }

        double total = 0;
        Grade highest = rows.get(0);
        Grade lowest = rows.get(0);

        for (Grade grade : rows) {
            double value = grade.percentage();
            total += value;
            if (value > highest.percentage()) {
                highest = grade;
            }
            if (value < lowest.percentage()) {
                lowest = grade;
            }
        }

        System.out.println();
        System.out.println("---------------- Class Statistics ----------------");
        System.out.printf("Records: %d%n", rows.size());
        System.out.printf("Students: %d%n", countStudents(rows));
        System.out.printf("Average: %.1f%%%n", total / rows.size());
        System.out.printf("Highest: %.1f%% (%s - %s)%n", highest.percentage(), highest.studentName, highest.subject);
        System.out.printf("Lowest: %.1f%% (%s - %s)%n", lowest.percentage(), lowest.studentName, lowest.subject);
    }

    private static void printStudentAverages() {
        ArrayList<String> keys = new ArrayList<String>();
        System.out.println();
        System.out.println("---------------- Student Averages ----------------");

        for (Grade grade : grades) {
            String key = grade.rollNo + "::" + grade.studentName.toLowerCase();
            if (!keys.contains(key)) {
                keys.add(key);
            }
        }

        for (String key : keys) {
            ArrayList<Grade> studentGrades = new ArrayList<Grade>();
            for (Grade grade : grades) {
                String gradeKey = grade.rollNo + "::" + grade.studentName.toLowerCase();
                if (gradeKey.equals(key)) {
                    studentGrades.add(grade);
                }
            }

            double total = 0;
            double highest = studentGrades.get(0).percentage();
            double lowest = studentGrades.get(0).percentage();
            for (Grade grade : studentGrades) {
                double value = grade.percentage();
                total += value;
                highest = Math.max(highest, value);
                lowest = Math.min(lowest, value);
            }

            Grade first = studentGrades.get(0);
            System.out.printf("%s (%s, %s): average %.1f%%, high %.1f%%, low %.1f%%%n",
                first.studentName,
                first.rollNo,
                first.className,
                total / studentGrades.size(),
                highest,
                lowest);
        }
    }

    private static int countStudents(ArrayList<Grade> rows) {
        ArrayList<String> keys = new ArrayList<String>();
        for (Grade grade : rows) {
            String key = grade.rollNo + "::" + grade.studentName.toLowerCase();
            if (!keys.contains(key)) {
                keys.add(key);
            }
        }
        return keys.size();
    }

    private static Grade findById(int id) {
        for (Grade grade : grades) {
            if (grade.id == id) {
                return grade;
            }
        }
        return null;
    }

    private static Grade readGradeFromInput() {
        Grade grade = new Grade();
        grade.rollNo = readLine("Roll number: ").toUpperCase();
        grade.studentName = readLine("Student name: ");
        grade.className = readLine("Class: ");
        grade.subject = readLine("Subject: ");
        grade.score = readInt("Score: ");
        grade.maxScore = readInt("Max score: ");

        if (!grade.rollNo.matches("[A-Z0-9-]{2,20}")) {
            System.out.println("Roll number must be 2-20 letters, numbers, or hyphens.");
            return null;
        }
        if (grade.studentName.length() < 2 || grade.className.length() < 2 || grade.subject.length() < 2) {
            System.out.println("Name, class, and subject are required.");
            return null;
        }
        if (grade.maxScore < 1 || grade.score < 0 || grade.score > grade.maxScore) {
            System.out.println("Score must be between 0 and max score.");
            return null;
        }
        return grade;
    }

    private static String readLine(String prompt) {
        System.out.print(prompt);
        return scanner.nextLine().trim().replaceAll("\\s+", " ");
    }

    private static int readInt(String prompt) {
        while (true) {
            try {
                return Integer.parseInt(readLine(prompt));
            } catch (NumberFormatException error) {
                System.out.println("Enter a whole number.");
            }
        }
    }

    private static String quote(String value) {
        return "'" + value.replace("'", "''") + "'";
    }

    private static String runSql(String sql) throws IOException, InterruptedException {
        ProcessBuilder builder = new ProcessBuilder(
            "psql",
            databaseUrl,
            "-v", "ON_ERROR_STOP=1",
            "-q",
            "-A",
            "-F", DELIMITER,
            "-t",
            "-c",
            sql
        );
        builder.redirectErrorStream(true);
        Process process = builder.start();
        BufferedReader reader = new BufferedReader(
            new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8)
        );
        StringBuilder output = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            output.append(line).append('\n');
        }

        int code = process.waitFor();
        if (code != 0) {
            throw new IllegalStateException(output.toString().trim());
        }
        return output.toString();
    }
}
