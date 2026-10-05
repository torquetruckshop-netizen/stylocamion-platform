const $ = (id) => document.getElementById(id);

const labels = {
  origin: "Origen",
  destination: "Destino",
  weight_tn: "Peso",
  product: "Producto",
  equipment: "Equipo",
  date_hint: "Fecha"
};

function valueFor(key, value) {
  if (value == null || value === "") return "Pendiente";
  if (key === "weight_tn") return `${value} t`;
  return String(value);
}

function statusText(status) {
  return status === "ready" ? "Listo" :
    status === "armed" ? "Activo" :
    status === "waiting" ? "En espera" :
    status === "needs_input" ? "Faltan datos" : status;
}

async function analyze() {
  const text = $("loadText").value.trim();
  if (!text) return;

  $("analyzeBtn").disabled = true;
  $("analyzeBtn").textContent = "Analizando…";

  try {
    const res = await fetch("/api/cargas/orchestrate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({text})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo analizar");

    $("result").classList.remove("hidden");
    $("fields").innerHTML = Object.entries(labels).map(([key,label]) =>
      `<article class="field"><span>${label}</span><strong>${valueFor(key,data.load[key])}</strong></article>`
    ).join("");

    $("statusBadge").textContent = data.ready_to_publish ? "LISTA" : "INCOMPLETA";
    $("statusBadge").className = "badge " + (data.ready_to_publish ? "ok" : "warn");

    $("a-orch").textContent = statusText(data.agents.orchestrator.status);
    $("a-load").textContent = statusText(data.agents.load_agent.status);
    $("a-match").textContent = statusText(data.agents.matching_agent.status);
    $("a-return").textContent = statusText(data.agents.return_radar_agent.status);
    $("a-alert").textContent = statusText(data.agents.exception_agent.status);

    $("message").textContent = data.message;
    $("publishBtn").disabled = !data.ready_to_publish;
  } catch (err) {
    $("result").classList.remove("hidden");
    $("message").textContent = "No pudimos procesar la carga: " + err.message;
  } finally {
    $("analyzeBtn").disabled = false;
    $("analyzeBtn").textContent = "Analizar carga";
  }
}

$("analyzeBtn").addEventListener("click", analyze);
$("clearBtn").addEventListener("click", () => {
  $("loadText").value = "";
  $("result").classList.add("hidden");
});
$("loadText").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") analyze();
});
