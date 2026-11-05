// Editorial drafts. A qualified reviewer must approve each immutable version
// before changing status to reviewed and supplying reviewedBy/reviewedAt.
const draft = (id, title, lessons, prompts) => ({
  id, title, version: '2026-09-draft-1', country: 'AR', language: 'es-AR', minutes: 10,
  status: 'draft', reviewedBy: null, reviewedAt: null, format: 'text',
  scope: 'Contenido teórico introductorio. Se aplica el procedimiento de la empresa y del fabricante.',
  lessons, questions: prompts.map(([prompt, correct, incorrect], i) => ({ prompt,
    options: i % 2 ? [incorrect, correct] : [correct, incorrect], answer: i % 2 })),
});
export const ACADEMY_COURSES = [
  draft('chequeo-previo', 'Chequeo previo: detectar e informar', [
    'Antes de revisar, detené la unidad en el lugar permitido y seguí el procedimiento de inmovilización de tu empresa. No te ubiques debajo de un vehículo ni intervengas mecanismos para realizar este contenido.',
    'Usá la lista correspondiente al vehículo y al equipo. Observá los puntos accesibles previstos en el procedimiento: luces, neumáticos, pérdidas visibles, documentación y estado aparente del conjunto.',
    'Registrá la anomalía con unidad, lugar, fecha y descripción. Si podés hacerlo sin riesgo, agregá una foto. Una fotografía no reemplaza un diagnóstico.',
    'Ante una anomalía que pueda comprometer la seguridad, no iniciés la marcha hasta la revisión del responsable competente. El registro digital no habilita el vehículo.'
  ], [
    ['¿Cuándo revisás la unidad?', 'Con la unidad detenida e inmovilizada según el procedimiento.', 'Mientras se mueve lentamente.'],
    ['¿Qué lista utilizás?', 'La correspondiente a la unidad y su equipo.', 'Cualquier lista, sin importar el vehículo.'],
    ['¿Qué registrás ante una anomalía?', 'Unidad, fecha y descripción del hallazgo.', 'Solamente que terminaste el chequeo.'],
    ['¿Una fotografía confirma el diagnóstico?', 'No, requiere revisión competente.', 'Sí, siempre.'],
    ['¿El chequeo en Stylo habilita el vehículo?', 'No; es un registro preventivo.', 'Sí, reemplaza las revisiones obligatorias.']
  ]),
  draft('fatiga-descanso', 'Fatiga: reconocer señales y pedir una pausa', [
    'Antes de iniciar o retomar un viaje, revisá cómo te sentís y qué descanso tuviste. La presión por llegar no cambia la necesidad de descansar.',
    'Si sentís somnolencia o dificultad para mantener la atención, evitá iniciar o retomar la conducción. Si ya estás en viaje, buscá detenerte en un lugar permitido y seguro siguiendo el procedimiento de tu empresa.',
    'Comunicá la situación al responsable y coordiná el descanso o la asistencia necesaria. Abrir la ventanilla, poner música o hacer ejercicios no reemplaza el sueño.',
    'Si la situación se repite, consultá con un profesional de salud. Este contenido no evalúa aptitud ni solicita que compartas información médica con la empresa.'
  ], [
    ['¿Qué conviene revisar antes de retomar el viaje?', 'El descanso y cómo te sentís.', 'Solamente la hora de llegada.'],
    ['¿Qué hacés si sentís somnolencia antes de salir?', 'No iniciás y coordinás descanso o asistencia.', 'Salís y observás qué pasa.'],
    ['¿La música reemplaza el sueño?', 'No.', 'Sí.'],
    ['¿Qué hacés si el problema se repite?', 'Consultás con un profesional de salud.', 'Lo ignorás.'],
    ['¿Este módulo certifica aptitud para conducir?', 'No.', 'Sí.']
  ]),
  draft('sujecion-carga', 'Sujeción de carga: reconocer los límites', [
    'Antes del traslado, identificá el tipo de carga y el procedimiento aplicable. El método de sujeción depende de la carga, el vehículo y los elementos utilizados.',
    'La selección, capacidad y disposición de los elementos debe definirse con personal competente y las indicaciones aplicables. No se calculan aquí tensiones ni cantidades universales de amarres.',
    'Revisá los elementos accesibles según el procedimiento. Ante desgaste, daño o dudas, pedí revisión antes de salir; no improvises reparaciones.',
    'Documentá lo observado. Durante el viaje, realizá las verificaciones previstas por el procedimiento en lugares permitidos, con el vehículo detenido. Nunca subas a la carga sin un sistema de trabajo seguro.'
  ], [
    ['¿Sirve un mismo método para todas las cargas?', 'No; depende del conjunto y la carga.', 'Sí.'],
    ['¿Quién define los elementos adecuados?', 'Personal competente siguiendo las indicaciones aplicables.', 'Una foto analizada automáticamente.'],
    ['¿Qué hacés ante un amarre dañado?', 'Pedís revisión antes de salir.', 'Lo reparás de manera improvisada.'],
    ['¿Cuándo verificás durante el viaje?', 'Detenido, en lugar permitido y siguiendo el procedimiento.', 'Con el vehículo en movimiento.'],
    ['¿Este módulo calcula cuántos amarres necesitás?', 'No.', 'Sí, para cualquier carga.']
  ]),
  draft('neumaticos-acoples', 'Neumáticos, frenos y acoples: informar anomalías', [
    'Seguí la inspección prevista para el equipo. Neumáticos, frenos y acoples son componentes críticos: este contenido enseña a informar anomalías, no a repararlos.',
    'Desde una posición segura, observá daños visibles en los puntos accesibles. Las presiones, tolerancias y pruebas funcionales dependen del fabricante y del procedimiento técnico.',
    'Una alarma, pérdida o condición dudosa requiere la revisión del responsable competente. No desarmes, ajustes ni anules componentes para continuar.',
    'Identificá la unidad, registrá lo observado y comunicá el problema. La ausencia de una falla visible no garantiza el estado del sistema.'
  ], [
    ['¿Qué enseña este módulo?', 'A reconocer los límites de la inspección e informar.', 'A reparar frenos sin asistencia.'],
    ['¿Las tolerancias son universales?', 'No; se consulta fabricante y procedimiento.', 'Sí.'],
    ['¿Qué hacés ante una alarma del sistema?', 'Pedís revisión del responsable competente.', 'La anulás.'],
    ['¿Qué identificás en el reporte?', 'La unidad y lo observado.', 'Únicamente el nombre del conductor.'],
    ['¿No ver daños garantiza que todo funciona?', 'No.', 'Sí.']
  ]),
  draft('ingreso-cliente', 'Ingreso a un cliente: preparar y verificar', [
    'Antes del viaje, confirmá con el responsable los requisitos del establecimiento, el turno y la documentación solicitada para la fecha prevista.',
    'Al llegar, respetá las indicaciones de ingreso, circulación, espera y elementos de protección. Las reglas de otro establecimiento no se trasladan automáticamente.',
    'Si falta un documento o la información no coincide, avisá al responsable y esperá instrucciones. No alteres documentos ni declares una autorización inexistente.',
    'Registrá los horarios y las incidencias. Una carpeta completa o una constancia de capacitación no equivale a permiso de ingreso: la aceptación corresponde al establecimiento.'
  ], [
    ['¿Para qué fecha verificás la documentación?', 'Para la fecha del trabajo previsto.', 'Solamente para hoy.'],
    ['¿Las reglas de otra planta se aplican automáticamente?', 'No.', 'Sí.'],
    ['¿Qué hacés si falta documentación?', 'Avisás y esperás instrucciones.', 'Declarás que existe.'],
    ['¿Qué conviene registrar?', 'Horarios e incidencias.', 'Únicamente el destino.'],
    ['¿Una carpeta completa garantiza el ingreso?', 'No; decide el establecimiento.', 'Sí.']
  ]),
];
