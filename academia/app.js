const courses = Array.isArray(window.STYLO_COURSES) ? window.STYLO_COURSES : [];
const grid = document.querySelector("#courseGrid");
const filters = document.querySelector("#filters");
const searchInput = document.querySelector("#searchInput");
const detail = document.querySelector("#courseDetail");

const categories = ["Todos", ...new Set(courses.map(course => course.category))];
let activeCategory = "Todos";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
}

function renderFilters(){
  filters.innerHTML = categories.map(category => '<button class="filter'+(category===activeCategory?' active':'')+'" type="button" data-category="'+escapeHtml(category)+'">'+escapeHtml(category)+'</button>').join("");
  filters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    renderFilters();
    renderCourses();
  }));
}

function renderCourses(){
  const term = (searchInput.value || "").trim().toLowerCase();
  const visible = courses.filter(course => {
    const categoryOk = activeCategory === "Todos" || course.category === activeCategory;
    const haystack = [course.title,course.category,course.level,course.objective,...course.lessons].join(" ").toLowerCase();
    return categoryOk && (!term || haystack.includes(term));
  });

  if(!visible.length){
    grid.innerHTML = '<p>No encontramos cursos con esos filtros.</p>';
    return;
  }

  grid.innerHTML = visible.map(course => '<article class="course-card"><div class="meta"><span class="category">'+escapeHtml(course.category)+'</span><span>'+escapeHtml(course.duration)+'</span></div><h3>'+escapeHtml(course.title)+'</h3><p>'+escapeHtml(course.objective)+'</p><div class="meta"><span>'+escapeHtml(course.level)+'</span><span>'+course.lessons.length+' microlecciones</span></div><button type="button" data-course="'+escapeHtml(course.id)+'">Ver curso</button></article>').join("");

  grid.querySelectorAll("[data-course]").forEach(button => button.addEventListener("click", () => openCourse(button.dataset.course)));
}

function openCourse(id){
  const course = courses.find(item => item.id === id);
  if(!course) return;
  const sources = course.sources?.length ? '<div class="sources"><h4>Fuentes oficiales</h4><ul>'+course.sources.map(source => '<li><a href="'+escapeHtml(source.url)+'" target="_blank" rel="noopener">'+escapeHtml(source.label)+'</a></li>').join("")+'</ul></div>' : "";

  detail.innerHTML = '<div class="detail-top"><div><p class="eyebrow">'+escapeHtml(course.category)+' · '+escapeHtml(course.duration)+'</p><h3>'+escapeHtml(course.title)+'</h3><p class="detail-objective">'+escapeHtml(course.objective)+'</p></div><div><span class="detail-badge">'+escapeHtml(course.level)+'</span><br><button class="close-detail" type="button">Cerrar</button></div></div><div class="detail-grid"><div><h4>Microlecciones</h4><ol>'+course.lessons.map(lesson => '<li class="lesson">'+escapeHtml(lesson)+'</li>').join("")+'</ol><div class="worksheet"><h4>Ficha práctica sugerida</h4><p>'+escapeHtml(course.worksheet)+'</p></div></div><div><h4>Evaluación breve</h4><ul>'+course.evaluation.map(item => '<li>'+escapeHtml(item)+'</li>').join("")+'</ul><div class="safety"><h4>Nota de seguridad</h4><p>'+escapeHtml(course.safety)+'</p></div>'+sources+'<div class="worksheet"><h4>Siguiente curso</h4><p>'+escapeHtml(course.next)+'</p></div></div></div>';

  detail.hidden = false;
  detail.querySelector(".close-detail")?.addEventListener("click", () => {
    detail.hidden = true;
    detail.innerHTML = "";
  });
  detail.scrollIntoView({behavior:"smooth",block:"start"});
}

searchInput?.addEventListener("input", renderCourses);
const year = document.querySelector("#year");
if(year) year.textContent = new Date().getFullYear();
renderFilters();
renderCourses();