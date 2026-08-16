export const LOAD_STATES = Object.freeze([
  'DETECTADA','EN_VALIDACION','PUBLICADA','BUSCANDO','PREASIGNADA','ADJUDICADA',
  'EN_CAMINO_A_CARGA','EN_CARGA','EN_TRANSITO','EN_DESTINO','DESCARGANDO',
  'ENTREGADA','A_EVALUAR','CERRADA','BLOQUEADA'
]);

const ALLOWED = Object.freeze({
  DETECTADA:['EN_VALIDACION','PUBLICADA','BLOQUEADA'],
  EN_VALIDACION:['PUBLICADA','BLOQUEADA'],
  PUBLICADA:['BUSCANDO','BLOQUEADA'],
  BUSCANDO:['PREASIGNADA','ADJUDICADA','BLOQUEADA'],
  PREASIGNADA:['BUSCANDO','ADJUDICADA','BLOQUEADA'],
  ADJUDICADA:['EN_CAMINO_A_CARGA','EN_CARGA','BLOQUEADA'],
  EN_CAMINO_A_CARGA:['EN_CARGA','EN_TRANSITO','BLOQUEADA'],
  EN_CARGA:['EN_TRANSITO','BLOQUEADA'],
  EN_TRANSITO:['EN_DESTINO','DESCARGANDO','BLOQUEADA'],
  EN_DESTINO:['DESCARGANDO','ENTREGADA','BLOQUEADA'],
  DESCARGANDO:['ENTREGADA','BLOQUEADA'],
  ENTREGADA:['A_EVALUAR','CERRADA'],
  A_EVALUAR:['CERRADA'],
  CERRADA:[],
  BLOQUEADA:[]
});

export function canTransitionLoad(from, to) {
  if (!from || !to || from===to) return false;
  return (ALLOWED[from] || []).includes(to);
}

export function inferOperationUpdate(text='') {
  const raw=String(text || '').trim();
  const normalized=normalize(raw);
  if (!normalized) return { matched:false, confidence:'LOW', target_state:null, event:null, raw_text:raw };

  const rules=[
    {
      event:'UNLOADED', target_state:'ENTREGADA', confidence:'HIGH',
      patterns:[/\bya descarg(ue|amos|ado)\b/,/\bdescarga (lista|terminada|finalizada)\b/,/\bquede? vaci[oa]\b/,/\bquedamos vacios\b/,/\bestoy libre\b/,/\bquede? libre\b/]
    },
    {
      event:'UNLOADING', target_state:'DESCARGANDO', confidence:'HIGH',
      patterns:[/\bdescargando\b/,/\ben descarga\b/,/\barrancando descarga\b/]
    },
    {
      event:'AT_DESTINATION', target_state:'EN_DESTINO', confidence:'HIGH',
      patterns:[/\blleg(ue|amos) a destino\b/,/\bya en destino\b/,/\ben destino\b/,/\blleg(ue|amos) a descarga\b/]
    },
    {
      event:'IN_TRANSIT', target_state:'EN_TRANSITO', confidence:'HIGH',
      patterns:[/\bsali cargad[oa]\b/,/\bsalimos cargados\b/,/\bya en ruta\b/,/\bviajando a destino\b/,/\ben viaje\b/]
    },
    {
      event:'LOADING', target_state:'EN_CARGA', confidence:'HIGH',
      patterns:[/\bcargando\b/,/\ben carga\b/,/\bentrando a cargar\b/,/\bme estan cargando\b/]
    },
    {
      event:'GOING_TO_PICKUP', target_state:'EN_CAMINO_A_CARGA', confidence:'HIGH',
      patterns:[/\byendo a cargar\b/,/\bvoy a cargar\b/,/\bcamino a carga\b/,/\bviajando a carga\b/,/\byendo a planta\b/]
    },
    {
      event:'LOAD_PROBABLY_COMPLETED', target_state:'EN_CARGA', confidence:'MEDIUM',
      patterns:[/\bya carg(ue|amos|ado)\b/,/\bcarga lista\b/]
    },
    {
      event:'PROBABLY_AVAILABLE', target_state:'ENTREGADA', confidence:'MEDIUM',
      patterns:[/\blibre\b/,/\bvacio\b/,/\btermine\b/]
    }
  ];

  for (const rule of rules) {
    if (rule.patterns.some(rx=>rx.test(normalized))) {
      return {
        matched:true,
        confidence:rule.confidence,
        target_state:rule.target_state,
        event:rule.event,
        raw_text:raw,
        normalized_text:normalized
      };
    }
  }

  return { matched:false, confidence:'LOW', target_state:null, event:null, raw_text:raw, normalized_text:normalized };
}

export function evaluateOperationUpdate({ currentState, inference, allowMediumConfidence=false }={}) {
  if (!inference?.matched) return { action:'IGNORE', reason:'NO_OPERATION_SIGNAL' };
  if (inference.confidence==='MEDIUM' && !allowMediumConfidence) {
    return { action:'SUGGEST', reason:'AMBIGUOUS_OPERATION_SIGNAL', target_state:inference.target_state };
  }
  if (inference.confidence==='LOW') return { action:'IGNORE', reason:'LOW_CONFIDENCE' };
  if (currentState===inference.target_state) return { action:'NOOP', reason:'ALREADY_IN_STATE', target_state:inference.target_state };
  if (!canTransitionLoad(currentState,inference.target_state)) {
    return {
      action:'REVIEW',
      reason:'TRANSITION_NOT_ALLOWED',
      from:currentState,
      target_state:inference.target_state
    };
  }
  return { action:'APPLY', from:currentState, target_state:inference.target_state, reason:inference.event };
}

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim()
    .replace(/\s+/g,' ');
}
