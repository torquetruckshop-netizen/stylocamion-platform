const $ = (selector) => document.querySelector(selector);
const state = { data: null, selected: null, userId: null, invitation: null };
const labels = { 'al-dia': 'Al día', 'por-vencer': 'Próximo a revisar', pendiente: 'Pendiente', refuerzo: 'Requiere refuerzo' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const date = (value) => value ? new Date(value).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—';
const org = () => state.data?.organizations.find((item) => item.id === state.selected);
const endpoint = (action) => `/api/academy/organizations/${state.selected}/${action}`;
const errors = {
  AUTH_REQUIRED: 'Ingresá a Mi Stylo para continuar.', AUTH_INVALID: 'Tu sesión venció. Volvé a ingresar a Mi Stylo.',
  ACCOUNT_NOT_INITIALIZED: 'Completá primero tu cuenta y tu nombre en Mi Stylo.',
  ACADEMY_CONFIGURATION_PENDING: 'El piloto aún no está habilitado en este servidor.',
  ACADEMY_UNAVAILABLE: 'No pudimos acceder a los datos. Volvé a intentar; no mostramos datos de ejemplo.',
  ACADEMY_FORBIDDEN: 'No tenés acceso a este espacio o tu participación fue desactivada.',
  ACADEMY_INVITE_INVALID: 'La invitación venció o ya fue utilizada. Pedí una nueva a tu empresa.',
  ACADEMY_ACCOUNT_REQUIRED: 'Completá primero tu nombre en Mi Stylo.',
  ACADEMY_CONFLICT: 'Hubo otro cambio al mismo tiempo. Actualizá y volvé a intentar.',
  ACADEMY_RETRY_LATER: 'Revisá el contenido y esperá un minuto antes de volver a responder.',
  ACADEMY_COURSE_NOT_REVIEWED: 'Este contenido todavía requiere revisión técnica.',
  ACADEMY_ASSIGNMENT_EXISTS: 'El conductor ya tiene este curso asignado y vigente.',
  ACADEMY_PILOT_LIMIT: 'Este espacio alcanzó el límite del piloto. Consultá con Stylo.',
  ACADEMY_DATE_INVALID: 'Elegí una fecha futura válida.',
  ACADEMY_OWNER_ALREADY_MEMBER: 'Ya administrás este espacio. La invitación es para otro participante.',
};
function notice(message, error = false) { $('#notice').textContent = message; $('#notice').className = error ? 'error' : ''; }
async function api(path, body) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store',
    ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Stylo-Academy': '1' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'ACADEMY_UNAVAILABLE');
  return data;
}
async function run(button, fn) {
  if (button) button.disabled = true;
  try { await fn(); } catch (error) {
    notice(errors[error.message] || 'No se pudo completar la operación. Volvé a intentar.', true);
    if (['AUTH_REQUIRED', 'AUTH_INVALID', 'ACCOUNT_NOT_INITIALIZED'].includes(error.message)) {
      $('#gate').hidden = false; $('#workspace').hidden = true; $('#lesson').hidden = true; $('#certificate').hidden = true;
    }
  } finally { if (button) button.disabled = false; }
}
async function refresh() {
  state.data = await api('/api/academy');
  if (!state.data.organizations.some((item) => item.id === state.selected)) state.selected = state.data.organizations[0]?.id ?? null;
  $('#create').hidden = !state.data.canCreate;
  $('#organization').innerHTML = state.data.organizations.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
  if (state.selected) $('#organization').value = state.selected;
  $('#workspace').hidden = !state.selected;
  render();
}
function render() {
  const current = org();
  $('#lesson').hidden = true; $('#certificate').hidden = true; $('#invite-link').replaceChildren();
  if (!current) return;
  $('#management').hidden = !current.manager;
  $('#leave').hidden = current.manager;
  $('#summary').innerHTML = Object.entries(labels).map(([key, label]) => `<div class="metric"><strong>${current.assignments.filter((a) => a.status === key).length}</strong><span>${label}</span></div>`).join('');
  const members = current.members.filter((member) => member.active);
  $('#assignment-form [name="memberId"]').innerHTML = members.map((member) => `<option value="${esc(member.id)}">${esc(member.name)}</option>`).join('');
  $('#assignment-form [name="courseId"]').innerHTML = state.data.courses.map((course) => `<option value="${esc(course.id)}">${esc(course.title)} · ${esc(course.minutes)} min</option>`).join('');
  $('#assignment-form button').disabled = !members.length || !state.data.courses.length;
  $('#catalog-state').textContent = !state.data.courses.length ? 'Los cinco contenidos iniciales están en revisión técnica. Se podrán asignar cuando estén aprobados.' : !members.length ? 'Invitá a un conductor para asignar el primer curso.' : 'Elegí el conductor y una fecha de entrega. La revisión posterior es un recordatorio de aprendizaje, no una vigencia legal.';
  $('#members').innerHTML = members.map((member) => `<div class="member"><span>${esc(member.name)}</span><button class="secondary" data-remove="${esc(member.id)}">Desactivar acceso</button></div>`).join('');
  $('#members').querySelectorAll('[data-remove]').forEach((button) => button.onclick = () => {
    if (confirm('¿Desactivar el acceso de este participante? El historial permanecerá en el informe.')) run(button, async () => { await api(endpoint('members'), { memberId: button.dataset.remove }); await refresh(); notice('Acceso desactivado.'); });
  });
  renderAssignments();
}
function renderAssignments() {
  const current = org(); if (!current) return;
  const items = current.assignments.filter((item) => !$('#filter').value || item.status === $('#filter').value);
  $('#assignments').innerHTML = items.length ? items.map((item) => `<article class="assignment"><span class="status ${item.status}">${labels[item.status]}</span><h3>${esc(item.title)}</h3><p>${esc(item.learnerName)}</p><p class="meta">Entrega: ${date(item.dueAt)}${item.overdue ? ' · Entrega atrasada' : ''} · Resultado: ${item.score === null ? 'Sin evaluación' : item.score + '%'}${item.refreshAt ? ' · Revisar aprendizaje: ' + date(item.refreshAt) : ''}</p><div class="actions"><button data-lesson="${esc(item.id)}">${current.manager ? 'Ver contenido' : 'Abrir curso'}</button>${item.completedAt ? `<button class="secondary" data-certificate="${esc(item.id)}">Ver constancia</button>` : ''}</div></article>`).join('') : '<p>No hay asignaciones para mostrar.</p>';
  $('#assignments').querySelectorAll('[data-lesson]').forEach((button) => button.onclick = () => run(button, () => openLesson(button.dataset.lesson)));
  $('#assignments').querySelectorAll('[data-certificate]').forEach((button) => button.onclick = () => run(button, () => certificate(button.dataset.certificate)));
}
async function openLesson(id) {
  const { course, assignment } = await api(endpoint(`lessons/${id}`));
  const manager = org().manager;
  const section = $('#lesson');
  section.innerHTML = `<p class="eyebrow">${esc(course.minutes)} MIN · TEXTO · ${esc(course.version)}</p><h2>${esc(course.title)}</h2><p>${esc(course.scope)}</p><ol>${course.lessons.map((lesson) => `<li>${esc(lesson)}</li>`).join('')}</ol><p>Evaluación de comprensión: se requiere al menos 80%. La constancia no certifica una práctica ni habilitación.</p>${manager ? '<p>Vista del responsable. La evaluación la responde cada participante desde su cuenta.</p>' : assignment.completedAt ? '<p>Ya completaste esta asignación. Tu constancia está disponible en Seguimiento.</p>' : `<form id="quiz">${course.questions.map((q, i) => `<fieldset><legend>${i + 1}. ${esc(q.prompt)}</legend>${q.options.map((option, j) => `<label class="choice"><input required type="radio" name="q${i}" value="${j}">${esc(option)}</label>`).join('')}</fieldset>`).join('')}<label class="choice"><input required type="checkbox" name="acknowledged">Leí el contenido y respondí personalmente. Comprendo el alcance teórico de esta constancia.</label><button>Enviar evaluación</button></form>`}`;
  if ($('#quiz')) $('#quiz').onsubmit = (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    run(event.submitter, async () => {
      const result = await api(endpoint(`submit/${id}`), { answers: course.questions.map((_, i) => Number(form.get(`q${i}`))), acknowledged: form.has('acknowledged') });
      await refresh(); notice(result.completedAt ? `Completado: ${result.score}%. Ya podés descargar tu constancia.` : `Resultado: ${result.score}%. Revisá el contenido y volvé a intentarlo en un minuto.`);
      if (!result.completedAt) await openLesson(id);
    });
  };
  section.hidden = false; section.focus(); section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function certificate(id) {
  const data = await api(endpoint(`certificate/${id}`));
  const section = $('#certificate');
  section.innerHTML = `<p class="eyebrow">STYLO CAMIÓN · ACADEMIA</p><h2>Constancia de realización</h2><p>${esc(data.statement)}</p><dl><dt>Participante</dt><dd>${esc(data.learner)}</dd><dt>Empresa</dt><dd>${esc(data.organization)}</dd><dt>Contenido</dt><dd>${esc(data.title)}</dd><dt>Versión</dt><dd>${esc(data.version)}</dd><dt>Fecha</dt><dd>${date(data.completedAt)}</dd><dt>Resultado</dt><dd>${data.score}%</dd><dt>Número</dt><dd>${esc(data.number)}</dd></dl><button id="print">Imprimir o guardar PDF</button>`;
  $('#print').onclick = () => window.print(); section.hidden = false; section.focus(); section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function exportCsv() {
  const current = org();
  const cell = (value) => { const text = String(value ?? ''); return '"' + (/^[\s]*[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"'; };
  const rows = [['Participante', 'Curso', 'Versión', 'Estado', 'Entrega', 'Completado', 'Revisar aprendizaje', 'Resultado %'], ...current.assignments.map((a) => [a.learnerName, a.title, a.version, labels[a.status], date(a.dueAt), date(a.completedAt), date(a.refreshAt), a.score])];
  const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map((row) => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'academia-flota-informe.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#organization').onchange = () => { state.selected = $('#organization').value; render(); };
$('#filter').onchange = renderAssignments;
$('#export').onclick = exportCsv;
$('#create-form').onsubmit = (event) => { event.preventDefault(); const name = new FormData(event.currentTarget).get('name'); run(event.submitter, async () => { const result = await api('/api/academy/organizations', { name }); state.selected = result.id; await refresh(); notice('Espacio creado. Podés invitar a tu equipo.'); }); };
$('#assignment-form').onsubmit = (event) => { event.preventDefault(); const input = Object.fromEntries(new FormData(event.currentTarget)); input.refreshDays = Number(input.refreshDays); run(event.submitter, async () => { await api(endpoint('assign'), input); await refresh(); notice('Curso asignado.'); }); };
$('#invite').onclick = (event) => run(event.currentTarget, async () => {
  const invitation = await api(endpoint('invite'), {});
  const url = `${location.origin}/academia-flota#invite=${encodeURIComponent(invitation.organizationId + ':' + invitation.token)}`;
  $('#invite-link').innerHTML = `<p>Vence: ${date(invitation.expiresAt)}. Copiá este enlace para compartirlo:</p><input readonly aria-label="Enlace de invitación" value="${esc(url)}"><p><a target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent('Te invito a Academia Flota de ' + invitation.name + ': ' + url)}">Compartir invitación por WhatsApp</a></p>`;
  $('#invite-link input').onclick = (e) => e.target.select(); notice('Invitación creada. Aún no se envió ningún mensaje.');
});
$('#leave').onclick = (event) => { if (confirm('¿Dejar de compartir nuevos avances con esta empresa? El historial previo seguirá visible para su responsable.')) run(event.currentTarget, async () => { await api(endpoint('members'), { memberId: state.userId }); await refresh(); notice('Participación desactivada.'); }); };
run(null, async () => {
  const account = await api('/api/account'); state.userId = account.profile.userId;
  await refresh(); notice(state.selected ? 'Tu avance y tus constancias se guardan en tu cuenta.' : 'Todavía no participás en una flota. Podés ingresar mediante una invitación de tu empresa.');
  const invite = new URLSearchParams(location.hash.slice(1)).get('invite');
  if (invite) {
    const [id, token] = invite.split(':');
    const details = await api(`/api/academy/organizations/${encodeURIComponent(id)}/invitation`, { token });
    $('#invitation').hidden = false;
    $('#invitation').innerHTML = `<h2>Invitación de ${esc(details.name)}</h2><p>Al aceptar, esta empresa podrá ver tu nombre, cursos asignados, resultados, fechas y constancias. No se comparten respuestas médicas. Podés dejar de participar; el historial anterior permanece en la empresa.</p><button id="accept">Aceptar y compartir mi avance</button>`;
    $('#accept').onclick = (event) => run(event.currentTarget, async () => {
      await api(`/api/academy/organizations/${id}/join`, { token, consent: true });
      history.replaceState(null, '', location.pathname); $('#invitation').hidden = true; state.selected = id; await refresh(); notice('Ya participás en la flota.');
    });
  }
});
