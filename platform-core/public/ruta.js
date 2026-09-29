const byId = (id) => document.getElementById(id);
async function checkAccess() {
  byId('retry').hidden = true;
  byId('login').hidden = true;
  byId('title').textContent = 'Verificando tu sesión';
  byId('status').textContent = 'Esperá un momento.';
  try {
    const response = await fetch('/api/ruta/access', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (response.status === 401 || result.error === 'ACCOUNT_NOT_INITIALIZED') {
      byId('title').textContent = 'Ingresá con Mi Stylo';
      byId('status').textContent = 'Ingresá o completá tu cuenta y luego volvé a esta pantalla.';
      byId('login').hidden = false;
    } else if (!response.ok) {
      throw new Error('ACCESS_CHECK_FAILED');
    } else {
      byId('title').textContent = result.user.displayName ? `Hola, ${result.user.displayName}` : 'Tu sesión está activa';
      byId('status').textContent = 'Reconocimos tu cuenta de Stylo. La habilitación del piloto está pendiente; todavía no tenés fondos ni operaciones disponibles.';
    }
  } catch {
    byId('title').textContent = 'No pudimos comprobar tu acceso';
    byId('status').textContent = 'Intentá nuevamente. No se habilitó ninguna operación.';
  } finally {
    byId('retry').hidden = false;
  }
}
byId('retry').addEventListener('click', checkAccess);
checkAccess();
