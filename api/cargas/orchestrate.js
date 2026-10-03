const CITIES = [
  "Paraná","Crespo","Concordia","Rosario","Santa Fe","Córdoba","Buenos Aires",
  "Campana","Rafaela","San Francisco","Mendoza","Neuquén","Bahía Blanca",
  "Zárate","Pergamino","Venado Tuerto","Reconquista","Gualeguaychú"
];

function normalize(text="") {
  return text.replace(/\s+/g," ").trim();
}

function firstMatch(text, re) {
  const m = text.match(re);
  return m ? m[1] : null;
}

function detectCities(text) {
  const low = text.toLowerCase();
  return CITIES.filter(c => low.includes(c.toLowerCase()));
}

function detectEquipment(text) {
  const low = text.toLowerCase();
  const rules = [
    ["tolva", /\btolva\b/],
    ["sider", /\bsider\b/],
    ["semirremolque", /\bsemi(?:rremolque)?\b|\bsemirremolque\b/],
    ["chasis y acoplado", /\bchasis\b.*\bacoplado\b|\bacoplado\b.*\bchasis\b/],
    ["cerealero", /\bcereal(?:ero)?\b|\bgrano(?:s)?\b/],
    ["tanque", /\btanque\b|\bl[ií]quido(?:s)?\b/],
    ["porta contenedor", /\bcontenedor(?:es)?\b/],
    ["carretón", /\bcarret[oó]n\b|\bmaquinaria\b/]
  ];
  for (const [name,re] of rules) if (re.test(low)) return name;
  return null;
}

function detectProduct(text) {
  const low=text.toLowerCase();
  const catalog=["soja","maíz","maiz","trigo","fertilizante","cítricos","citricos","arena","piedra","madera","acero","alimentos","maquinaria","combustible"];
  const hit=catalog.find(x=>low.includes(x));
  return hit ? hit.replace("maiz","maíz").replace("citricos","cítricos") : null;
}

function parseLoad(text) {
  const clean=normalize(text);
  const cities=detectCities(clean);
  const tons=firstMatch(clean, /(\d+(?:[.,]\d+)?)\s*(?:t|tn|ton|tons|toneladas?)\b/i);
  const kg=firstMatch(clean, /(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?)\b/i);
  const date=firstMatch(clean, /\b(para\s+(?:hoy|mañana|pasado mañana|el\s+\d{1,2}(?:\/\d{1,2})?))\b/i);

  return {
    origin: cities[0] || null,
    destination: cities[1] || null,
    weight_tn: tons ? Number(tons.replace(",",".")) : (kg ? Number(kg.replace(",","."))/1000 : null),
    product: detectProduct(clean),
    equipment: detectEquipment(clean),
    date_hint: date ? date.replace(/^para\s+/i,"") : null,
    raw_text: clean
  };
}

function missingFields(load) {
  return [
    ["origin","origen"],
    ["destination","destino"],
    ["weight_tn","peso"],
    ["product","producto"],
    ["date_hint","fecha"]
  ].filter(([key])=>!load[key]).map(([,label])=>label);
}

function buildAgents(load) {
  const missing=missingFields(load);
  return {
    orchestrator: {
      status: missing.length ? "needs_input" : "ready",
      next_action: missing.length ? "complete_load" : "publish_and_match"
    },
    load_agent: {status: "ready", extracted: load},
    matching_agent: {
      status: load.origin && load.destination ? "ready" : "waiting",
      criteria: ["origen/destino","tipo de equipo","disponibilidad","retorno","historial"]
    },
    return_radar_agent: {
      status: load.destination ? "ready" : "waiting",
      rule: "priorizar camiones que finalizan viaje cerca del origen o regresan desde el destino"
    },
    exception_agent: {
      status: "armed",
      watches: ["demora","desvío","detención prolongada","documentación faltante","pérdida de contacto"]
    }
  };
}

module.exports = async function handler(req,res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ok:false,error:"method_not_allowed"});

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const text = String(body.text || "");
  if (!text.trim()) return res.status(400).json({ok:false,error:"text_required"});

  const load=parseLoad(text);
  const missing=missingFields(load);

  return res.status(200).json({
    ok:true,
    load,
    missing,
    ready_to_publish: missing.length === 0,
    agents: buildAgents(load),
    message: missing.length
      ? `Entendí la carga. Falta confirmar: ${missing.join(", ")}.`
      : "Carga preparada. Lista para publicar y ejecutar matching."
  });
};
