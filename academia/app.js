const courses = Array.isArray(window.STYLO_COURSES) ? window.STYLO_COURSES : [];
const grid = document.querySelector("#courseGrid");
const filters = document.querySelector("#filters");
const searchInput = document.querySelector("#searchInput");
const detail = document.querySelector("#courseDetail");
const routeGrid = document.querySelector("#routeGrid");
const courseCount = document.querySelector("#courseCount");
const progressStarted = document.querySelector("#progressStarted");
const progressCompleted = document.querySelector("#progressCompleted");
const progressPercent = document.querySelector("#progressPercent");
const progressBarFill = document.querySelector("#progressBarFill");
const PROGRESS_KEY = "stylo-academy-progress-v1";

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); }
  catch { return {}; }
}
let studentProgress = loadProgress();

function saveProgress(){
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(studentProgress));
  renderProgress();
  renderCourses();
}

function setCourseStatus(id,status){
  if(status === "not-started") delete studentProgress[id];
  else studentProgress[id] = status;
  saveProgress();
  if(detail && !detail.hidden) openCourse(id);
}

function statusLabel(status){
  return status === "completed" ? "Completado" : status === "in-progress" ? "En curso" : "No iniciado";
}

function renderProgress(){
  const values = Object.values(studentProgress);
  const started = values.filter(value => value === "in-progress").length;
  const completed = values.filter(value => value === "completed").length;
  const percent = courses.length ? Math.round((completed / courses.length) * 100) : 0;
  if(progressStarted) progressStarted.textContent = String(started);
  if(progressCompleted) progressCompleted.textContent = String(completed);
  if(progressPercent) progressPercent.textContent = percent + "%";
  if(progressBarFill) progressBarFill.style.width = percent + "%";
}

const categories = ["Todos", ...new Set(courses.map(course => course.category))];
let activeCategory = "Todos";

const learningRoutes = [
  {name:"Operación segura", description:"Documentación, descanso, control de la unidad y cierre correcto de cada viaje.", categories:["Documentación","Salud y seguridad","Operación"]},
  {name:"Logística profesional", description:"Ingreso a plantas, trazabilidad, incidencias y procesos que ordenan una operación.", categories:["Logística","Gestión","Operación"]},
  {name:"Rentabilidad del camión", description:"Aprendé a medir consumo, kilómetros improductivos y variables que afectan el resultado.", categories:["Economía"]},
  {name:"Cargas especiales", description:"Formación específica para agro, refrigerados y otras operaciones que requieren controles particulares.", categories:["Agro","Refrigerados"]},
  {name:"Transporte internacional", description:"Preparación documental y operativa para viajes por carretera entre países de la región.", categories:["Internacional"]}
];

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
}

function renderRoutes(){
  if(!routeGrid) return;
  routeGrid.innerHTML = learningRoutes.map((route,index) => {
    const routeCourses = courses.filter(course => route.categories.includes(course.category));
    return '<article class="route-card"><span class="route-number">0'+(index+1)+'</span><p class="route-label">RUTA DE APRENDIZAJE</p><h3>'+escapeHtml(route.name)+'</h3><p>'+escapeHtml(route.description)+'</p><div class="route-footer"><strong>'+routeCourses.length+' cursos disponibles</strong><button type="button" data-route="'+index+'">Ver ruta</button></div></article>';
  }).join("");
  routeGrid.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => {
    const route = learningRoutes[Number(button.dataset.route)];
    activeCategory = "Todos";
    searchInput.value = "";
    renderFilters();
    renderCourses(route.categories);
    document.querySelector("#cursos")?.scrollIntoView({behavior:"smooth"});
  }));
}

function renderFilters(){
  filters.innerHTML = categories.map(category => '<button class="filter'+(category===activeCategory?' active':'')+'" type="button" data-category="'+escapeHtml(category)+'">'+escapeHtml(category)+'</button>').join("");
  filters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    renderFilters();
    renderCourses();
  }));
}

function renderCourses(routeCategories = null){
  const term = (searchInput.value || "").trim().toLowerCase();
  const visible = courses.filter(course => {
    const categoryOk = activeCategory === "Todos" || course.category === activeCategory;
    const routeOk = !routeCategories || routeCategories.includes(course.category);
    const haystack = [course.title,course.category,course.level,course.objective,...course.lessons].join(" ").toLowerCase();
    return categoryOk && routeOk && (!term || haystack.includes(term));
  });

  if(!visible.length){
    grid.innerHTML = '<p>No encontramos cursos con esos filtros.</p>';
    return;
  }

  grid.innerHTML = visible.map(course => {
    const status = studentProgress[course.id] || "not-started";
    return '<article class="course-card"><div class="meta"><span class="category">'+escapeHtml(course.category)+'</span><span>'+escapeHtml(course.duration)+'</span></div><span class="status '+status+'">'+statusLabel(status)+'</span><h3>'+escapeHtml(course.title)+'</h3><p>'+escapeHtml(course.objective)+'</p><div class="meta"><span>'+escapeHtml(course.level)+'</span><span>'+course.lessons.length+' microlecciones</span></div><button type="button" data-course="'+escapeHtml(course.id)+'">Ver curso</button></article>';
  }).join("");

  grid.querySelectorAll("[data-course]").forEach(button => button.addEventListener("click", () => openCourse(button.dataset.course)));
}

function openCourse(id){
  const course = courses.find(item => item.id === id);
  if(!course) return;
  const sources = course.sources?.length ? '<div class="sources"><h4>Fuentes oficiales</h4><ul>'+course.sources.map(source => '<li><a href="'+escapeHtml(source.url)+'" target="_blank" rel="noopener">'+escapeHtml(source.label)+'</a></li>').join("")+'</ul></div>' : "";

  const currentStatus = studentProgress[course.id] || "not-started";
  detail.innerHTML = '<div class="detail-top"><div><p class="eyebrow">'+escapeHtml(course.category)+' · '+escapeHtml(course.duration)+'</p><h3>'+escapeHtml(course.title)+'</h3><p class="detail-objective">'+escapeHtml(course.objective)+'</p><div class="course-progress-actions"><span class="status '+currentStatus+'">'+statusLabel(currentStatus)+'</span><button type="button" data-status="in-progress">Marcar en curso</button><button type="button" data-status="completed">Marcar completado</button><button type="button" data-status="not-started">Reiniciar</button></div></div><div><span class="detail-badge">'+escapeHtml(course.level)+'</span><br><button class="close-detail" type="button">Cerrar</button></div></div><div class="detail-grid"><div><h4>Microlecciones</h4><ol>'+course.lessons.map(lesson => '<li class="lesson">'+escapeHtml(lesson)+'</li>').join("")+'</ol><div class="worksheet"><h4>Ficha práctica sugerida</h4><p>'+escapeHtml(course.worksheet)+'</p></div></div><div><h4>Evaluación breve</h4><ul>'+course.evaluation.map(item => '<li>'+escapeHtml(item)+'</li>').join("")+'</ul><div class="safety"><h4>Nota de seguridad</h4><p>'+escapeHtml(course.safety)+'</p></div>'+sources+'<div class="worksheet"><h4>Siguiente curso</h4><p>'+escapeHtml(course.next)+'</p></div></div></div>';

  detail.hidden = false;
  detail.querySelectorAll("[data-status]").forEach(button => button.addEventListener("click", () => setCourseStatus(course.id, button.dataset.status)));
  detail.querySelector(".close-detail")?.addEventListener("click", () => {
    detail.hidden = true;
    detail.innerHTML = "";
  });
  detail.scrollIntoView({behavior:"smooth",block:"start"});
}

searchInput?.addEventListener("input", renderCourses);
const year = document.querySelector("#year");
if(year) year.textContent = new Date().getFullYear();
if(courseCount) courseCount.textContent = String(courses.length);
renderProgress();
renderRoutes();
renderFilters();
renderCourses();