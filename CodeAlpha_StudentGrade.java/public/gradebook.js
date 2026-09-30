const form = document.querySelector("#grade-form");
const statusNode = document.querySelector("#status");
const statsNode = document.querySelector("#stats");
const tableBody = document.querySelector("#grade-rows");
const editingId = document.querySelector("#editing-id");
const submitButton = document.querySelector("#submit-button");
const cancelButton = document.querySelector("#cancel-edit");

function setStatus(message, isError) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#9d3820" : "#14643f";
}

function percent(score, maxScore) {
  if (!maxScore) return 0;
  return Math.round((score / maxScore) * 1000) / 10;
}

function letter(value) {
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "F";
}

function statCard(label, value) {
  const card = document.createElement("article");
  card.className = "stat";
  const span = document.createElement("span");
  span.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  card.append(span, strong);
  return card;
}

function render(report) {
  const summary = report.summary;
  statsNode.replaceChildren(
    statCard("Average", `${summary.average}%`),
    statCard("Highest", `${summary.highest}%`),
    statCard("Lowest", `${summary.lowest}%`),
    statCard("Students", String(summary.studentCount)),
  );

  tableBody.replaceChildren();
  report.grades.forEach((grade) => {
    const row = document.createElement("tr");
    const values = [
      `${grade.studentName} (${grade.rollNo})`,
      grade.className,
      grade.subject,
      `${grade.score}/${grade.maxScore}`,
      `${percent(grade.score, grade.maxScore)}%`,
      letter(percent(grade.score, grade.maxScore)),
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index === values.length - 1) cell.className = "mark";
      row.append(cell);
    });

    const actions = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => fillForm(grade));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => removeGrade(grade.id));

    actions.append(editButton, " ", deleteButton);
    row.append(actions);
    tableBody.append(row);
  });
}

async function loadReport() {
  const response = await fetch("/api/grades");
  const report = await response.json();
  if (!response.ok) throw new Error(report.error || "Unable to load grades.");
  render(report);
}

function fillForm(grade) {
  editingId.value = String(grade.id);
  form.rollNo.value = grade.rollNo;
  form.studentName.value = grade.studentName;
  form.className.value = grade.className;
  form.subject.value = grade.subject;
  form.score.value = grade.score;
  form.maxScore.value = grade.maxScore;
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
}

function resetForm() {
  form.reset();
  editingId.value = "";
  submitButton.textContent = "Add grade";
  cancelButton.hidden = true;
}

async function removeGrade(id) {
  if (!window.confirm("Delete this grade?")) return;
  const response = await fetch(`/api/grades/${id}`, { method: "DELETE" });
  const result = await response.json();
  if (!response.ok) {
    setStatus(result.error || "Unable to delete grade.", true);
    return;
  }
  setStatus("Grade deleted.", false);
  await loadReport();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = editingId.value;
  const payload = {
    rollNo: form.rollNo.value,
    studentName: form.studentName.value,
    className: form.className.value,
    subject: form.subject.value,
    score: Number(form.score.value),
    maxScore: Number(form.maxScore.value),
  };

  const response = await fetch(id ? `/api/grades/${id}` : "/api/grades", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();

  if (!response.ok) {
    setStatus(result.error || "Unable to save grade.", true);
    return;
  }

  setStatus(id ? "Grade updated in SQL." : "Grade saved in SQL.", false);
  resetForm();
  await loadReport();
});

cancelButton.addEventListener("click", resetForm);

loadReport().catch((error) => setStatus(error.message, true));
