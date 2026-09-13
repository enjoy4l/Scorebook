const STORAGE_KEY = "gradebook-cwa-record";

const initialState = {
  semesters: [
    {
      name: "Semester 1",
      courses: [
        { name: "Introduction to Computing", credits: 3, score: 78 },
        { name: "Communication Skills", credits: 2, score: 64 },
        { name: "Mathematics I", credits: 3, score: 58 }
      ]
    }
  ]
};

let state = loadState();
const semestersContainer = document.querySelector("#semesters-container");

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(initialState);
  } catch (error) {
    console.warn("Could not load saved record.", error);
    return structuredClone(initialState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = document.querySelector("#save-status");
    status.textContent = "All changes saved";
    window.clearTimeout(saveState.timeout);
    saveState.timeout = window.setTimeout(() => { status.textContent = "Saved locally"; }, 1800);
  } catch (error) {
    document.querySelector("#save-status").textContent = "Could not save changes";
    console.error("Could not save record.", error);
  }
}

function newCourse() {
  return { name: "", credits: 3, score: "" };
}

function getDivision(score) {
  if (score >= 70) return { label: "First Class", className: "first" };
  if (score >= 60) return { label: "Second Upper", className: "upper" };
  if (score >= 50) return { label: "Second Lower", className: "lower" };
  if (score >= 45) return { label: "Third Class", className: "third" };
  if (score >= 40) return { label: "Pass", className: "pass" };
  return { label: score > 0 ? "Fail" : "Add courses to begin", className: "fail" };
}

function calculateSemester(semester) {
  const validCourses = semester.courses.filter(course => course.score !== "" && Number(course.credits) > 0 && Number(course.score) >= 0 && Number(course.score) <= 100);
  const credits = validCourses.reduce((sum, course) => sum + Number(course.credits), 0);
  const weightedScore = validCourses.reduce((sum, course) => sum + Number(course.credits) * Number(course.score), 0);
  return { credits, wa: credits ? weightedScore / credits : 0 };
}

function render() {
  semestersContainer.innerHTML = "";
  document.querySelector("#empty-state").hidden = state.semesters.length > 0;
  state.semesters.forEach((semester, semesterIndex) => {
    const result = calculateSemester(semester);
    const card = document.createElement("article");
    card.className = "semester-card";
    card.innerHTML = `
      <div class="semester-header">
        <input class="semester-name" value="${escapeAttribute(semester.name)}" aria-label="Semester name" data-semester="${semesterIndex}" />
        <div class="semester-summary">
          <div class="semester-wa"><span class="semester-wa-label">Semester WA</span><span class="semester-wa-value">${result.wa.toFixed(2)}</span></div>
          <button class="remove-semester" data-remove-semester="${semesterIndex}" title="Remove semester" aria-label="Remove semester">×</button>
        </div>
      </div>
      <div class="course-head"><span>Course</span><span>Credits</span><span>Score / 100</span><span>Course WA</span><span></span></div>
      <div class="course-list">
        ${semester.courses.map((course, courseIndex) => courseTemplate(course, semesterIndex, courseIndex)).join("")}
      </div>
      <button class="add-course" data-add-course="${semesterIndex}">+ Add course</button>
    `;
    semestersContainer.appendChild(card);
  });
  updateSummary();
}

function courseTemplate(course, semesterIndex, courseIndex) {
  const score = Number(course.score);
  const valid = course.score !== "" && Number(course.credits) > 0 && score >= 0 && score <= 100;
  return `
    <div class="course-row">
      <input class="course-input ${course.name === "" ? "" : ""}" placeholder="Course name" value="${escapeAttribute(course.name)}" data-field="name" data-semester="${semesterIndex}" data-course="${courseIndex}" aria-label="Course name" />
      <input class="course-input course-credit ${Number(course.credits) <= 0 ? "invalid" : ""}" type="number" min="1" step="1" value="${escapeAttribute(course.credits)}" data-field="credits" data-semester="${semesterIndex}" data-course="${courseIndex}" aria-label="Credit hours" />
      <input class="course-input course-score ${!valid && course.score !== "" ? "invalid" : ""}" type="number" min="0" max="100" step="1" value="${escapeAttribute(course.score)}" placeholder="0" data-field="score" data-semester="${semesterIndex}" data-course="${courseIndex}" aria-label="Score out of 100" />
      <span class="course-wa">${valid ? score.toFixed(2) : "—"}</span>
      <button class="remove-course" data-remove-course="${semesterIndex},${courseIndex}" title="Remove course" aria-label="Remove course">×</button>
    </div>
  `;
}

function updateSummary() {
  const results = state.semesters.map(calculateSemester);
  const totalCredits = results.reduce((sum, result) => sum + result.credits, 0);
  const totalWeighted = results.reduce((sum, result) => sum + result.wa * result.credits, 0);
  const cwa = totalCredits ? totalWeighted / totalCredits : 0;
  const division = getDivision(cwa);
  document.querySelector("#cwa-value").textContent = cwa.toFixed(2);
  document.querySelector("#division-value").textContent = division.label;
  document.querySelector("#cwa-progress").style.width = `${Math.min(cwa, 100)}%`;
  document.querySelector("#credits-value").textContent = totalCredits;
  document.querySelector("#courses-value").textContent = state.semesters.reduce((sum, semester) => sum + semester.courses.length, 0);
  const bestIndex = results.reduce((best, result, index) => result.credits && result.wa > (results[best]?.wa || 0) ? index : best, -1);
  document.querySelector("#best-semester-value").textContent = bestIndex >= 0 ? results[bestIndex].wa.toFixed(2) : "—";
  document.querySelector("#best-semester-caption").textContent = bestIndex >= 0 ? state.semesters[bestIndex].name : "Your strongest WA";
}

function escapeAttribute(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function addSemester() {
  state.semesters.push({ name: `Semester ${state.semesters.length + 1}`, courses: [newCourse()] });
  saveState(); render();
}

function bindEvents() {
  document.querySelector("#add-semester-button").addEventListener("click", addSemester);
  document.querySelector("#empty-add-button").addEventListener("click", addSemester);
  document.querySelector("#reset-button").addEventListener("click", () => {
    if (window.confirm("Reset all semesters and start over?")) {
      state = { semesters: [] };
      saveState(); render();
    }
  });
  semestersContainer.addEventListener("input", event => {
    const target = event.target;
    const semesterIndex = Number(target.dataset.semester);
    if (target.classList.contains("semester-name")) state.semesters[semesterIndex].name = target.value;
    if (target.dataset.field) state.semesters[semesterIndex].courses[Number(target.dataset.course)][target.dataset.field] = target.dataset.field === "name" ? target.value : target.value === "" ? "" : Number(target.value);
    saveState();
  });
  semestersContainer.addEventListener("change", () => render());
  semestersContainer.addEventListener("click", event => {
    const target = event.target;
    if (target.dataset.addCourse !== undefined) state.semesters[Number(target.dataset.addCourse)].courses.push(newCourse());
    if (target.dataset.removeCourse) {
      const [semesterIndex, courseIndex] = target.dataset.removeCourse.split(",").map(Number);
      state.semesters[semesterIndex].courses.splice(courseIndex, 1);
      if (!state.semesters[semesterIndex].courses.length) state.semesters.splice(semesterIndex, 1);
    }
    if (target.dataset.removeSemester !== undefined) state.semesters.splice(Number(target.dataset.removeSemester), 1);
    if (target.dataset.addCourse !== undefined || target.dataset.removeCourse || target.dataset.removeSemester !== undefined) { saveState(); render(); }
  });
}

bindEvents();
render();
