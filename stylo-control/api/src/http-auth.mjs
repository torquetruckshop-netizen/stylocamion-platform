export function authenticateControlKey(headers={}, env=process.env){
  const provided=String(headers['x-control-key'] || '').trim();
  if (!provided) return null;
  const admin=String(env.CONTROL_ADMIN_KEY || '').trim();
  const investor=String(env.CONTROL_INVESTOR_KEY || '').trim();
  if (admin && timingSafeEqual(provided,admin)) return {role:'ADMIN'};
  if (investor && timingSafeEqual(provided,investor)) return {role:'INVESTOR'};
  return null;
}

export function requireControlIdentity(headers={}, env=process.env){
  const identity=authenticateControlKey(headers,env);
  if (!identity){
    const error=new Error('Autenticación requerida');
    error.status=401;
    error.code='CONTROL_UNAUTHORIZED';
    throw error;
  }
  return identity;
}

function timingSafeEqual(a,b){
  if (a.length!==b.length) return false;
  let result=0;
  for (let i=0;i<a.length;i++) result |= a.charCodeAt(i)^b.charCodeAt(i);
  return result===0;
}
