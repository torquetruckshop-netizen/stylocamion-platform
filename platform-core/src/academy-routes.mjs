export async function academyRoute({ req, url, user, service, readJson }) {
  const root = '/api/academy';
  const path = url.pathname.slice(root.length);
  if (req.method !== 'GET' && (req.headers['x-stylo-academy'] !== '1'
      || !String(req.headers['content-type']).startsWith('application/json'))) {
    throw new Error('ACADEMY_REQUEST_FORBIDDEN');
  }
  if (path === '' && req.method === 'GET') return service.index(user.id);
  if (path === '/organizations' && req.method === 'POST') return service.create(user.id, await readJson(req));
  const match = path.match(/^\/organizations\/([a-f0-9-]{36})\/(invite|invitation|join|members|assign|lessons|submit|certificate)(?:\/([a-f0-9-]{36}))?$/);
  if (!match) throw new Error('ACADEMY_NOT_FOUND');
  const [, id, action, assignmentId] = match;
  if (req.method === 'GET') {
    if (action === 'lessons') return service.lesson(id, user.id, assignmentId);
    if (action === 'certificate') return service.certificate(id, user.id, assignmentId);
  }
  if (req.method === 'POST') {
    const input = await readJson(req);
    if (action === 'invite') return service.invite(id, user.id);
    if (action === 'invitation') return service.invitation(id, input.token);
    if (action === 'join') return service.join(id, user.id, input);
    if (action === 'assign') return service.assign(id, user.id, input);
    if (action === 'submit') return service.submit(id, user.id, assignmentId, input);
    if (action === 'members') return service.removeMember(id, user.id, input);
  }
  throw new Error('ACADEMY_NOT_FOUND');
}
