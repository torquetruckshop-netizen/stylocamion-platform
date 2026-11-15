import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AcademyService } from '../src/academy-service.mjs';
import { MemoryAcademyStore, SupabaseAcademyStore } from '../src/academy-store.mjs';
import { MemoryStore } from '../src/memory-store.mjs';
import { ACADEMY_COURSES } from '../src/academy-courses.mjs';
import { StaticAuth } from '../src/auth.mjs';
import { createPlatformServer } from '../src/server.mjs';

async function fixture() {
  const accounts = new MemoryStore();
  const owner = randomUUID(), driver = randomUUID(), outsider = randomUUID();
  for (const [id, name] of [[owner, 'Responsable de prueba'], [driver, 'Participante de prueba'], [outsider, 'Otra flota']]) {
    await accounts.upsertProfile({ userId: id, displayName: name });
  }
  const courses = structuredClone(ACADEMY_COURSES);
  // Fixture-only approval. The shipped editorial catalog must remain draft.
  courses[0].status = 'reviewed'; courses[0].reviewedBy = 'fixture-only'; courses[0].reviewedAt = '2026-09-30';
  let now = new Date('2026-09-30T17:00:00Z');
  const store = new MemoryAcademyStore(accounts);
  const service = new AcademyService({ store, courses, pilotOwnerIds: new Set([owner]), clock: () => now });
  const org = await service.create(owner, { name: 'Flota de prueba' });
  const invitation = await service.invite(org.id, owner);
  await service.join(org.id, driver, { token: invitation.token, consent: true });
  return { service, store, accounts, org, owner, driver, outsider, courses, setNow: (value) => { now = new Date(value); } };
}
async function assign(f) { return f.service.assign(f.org.id, f.owner, { memberId: f.driver, courseId: f.courses[0].id, dueDate: '2026-10-10' }); }

test('editorial drafts cannot be assigned; creation restricted to pilot allowlist', async () => {
  const f = await fixture();
  assert.ok(ACADEMY_COURSES.every((c) => c.status === 'draft' && !c.reviewedBy));
  await assert.rejects(f.service.create(f.driver, { name: 'No permitida' }), /FORBIDDEN/);
  await assert.rejects(f.service.assign(f.org.id, f.owner, { memberId: f.driver, courseId: ACADEMY_COURSES[1].id, dueDate: '2026-10-10' }), /NOT_REVIEWED/);
  await assert.rejects(f.service.assign(f.org.id, f.owner, { memberId: f.driver, courseId: f.courses[0].id, dueDate: '2026-02-31' }), /DATE_INVALID/);
});

test('tenant isolation, least privilege, no answer keys or invite hashes in responses', async () => {
  const f = await fixture(); const a = await assign(f);
  assert.deepEqual((await f.service.index(f.outsider)).organizations, []);
  await assert.rejects(f.service.lesson(f.org.id, f.outsider, a.id), /FORBIDDEN/);
  await assert.rejects(f.service.invite(f.org.id, f.driver), /FORBIDDEN/);
  await assert.rejects(f.service.assign(f.org.id, f.driver, { memberId: f.driver, courseId: f.courses[0].id, dueDate: '2026-10-10' }), /FORBIDDEN/);
  const lesson = await f.service.lesson(f.org.id, f.driver, a.id);
  assert.ok(lesson.course.questions.every((q) => !('answer' in q)));
  const response = JSON.stringify(await f.service.index(f.owner));
  assert.ok(!response.includes('invites') && !response.includes('questions'));
  assert.equal((await f.service.index(f.driver)).organizations[0].members.length, 0);
});

test('invitations require consent, expire, and cannot enroll two people concurrently', async () => {
  const f = await fixture(); const invite = await f.service.invite(f.org.id, f.owner);
  await assert.rejects(f.service.join(f.org.id, f.outsider, { token: invite.token, consent: false }), /CONSENT_REQUIRED/);
  const results = await Promise.allSettled([f.service.join(f.org.id, f.outsider, { token: invite.token, consent: true }), f.service.join(f.org.id, f.driver, { token: invite.token, consent: true })]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const expired = await f.service.invite(f.org.id, f.owner); f.setNow('2026-10-08T18:00:00Z');
  await assert.rejects(f.service.invitation(f.org.id, expired.token), /INVITE_INVALID/);
});

test('server grades, rate limits, snapshots course version and produces idempotent private certificate', async () => {
  const f = await fixture(); const a = await assign(f);
  await assert.rejects(f.service.certificate(f.org.id, f.driver, a.id), /NOT_COMPLETED/);
  await assert.rejects(f.service.submit(f.org.id, f.owner, a.id, { answers: [], acknowledged: true }), /FORBIDDEN/);
  await assert.rejects(f.service.submit(f.org.id, f.driver, a.id, { answers: [99, 99, 99, 99, 99], acknowledged: true }), /INVALID/);
  const answers = f.courses[0].questions.map((q) => q.answer);
  const failed = await f.service.submit(f.org.id, f.driver, a.id, { answers: answers.map((n) => 1 - n), acknowledged: true, score: 100 });
  assert.equal(failed.score, 0); assert.equal(failed.status, 'refuerzo');
  await assert.rejects(f.service.submit(f.org.id, f.driver, a.id, { answers, acknowledged: true }), /RETRY_LATER/);
  f.setNow('2026-09-30T17:02:00Z'); f.courses[0].questions[0].answer = 1; f.courses[0].version = 'future-version';
  const results = await Promise.all([f.service.submit(f.org.id, f.driver, a.id, { answers, acknowledged: true }), f.service.submit(f.org.id, f.driver, a.id, { answers, acknowledged: true })]);
  assert.equal(results[0].score, 100); assert.equal(results[1].attempts, 2);
  const certificate = await f.service.certificate(f.org.id, f.driver, a.id);
  assert.equal(certificate.version, '2026-09-draft-1');
  await assert.rejects(f.service.certificate(f.org.id, f.outsider, a.id), /FORBIDDEN/);
  f.setNow('2026-12-24T17:00:00Z'); assert.equal((await f.service.index(f.driver)).organizations[0].assignments[0].status, 'por-vencer');
  f.setNow('2027-01-01T17:00:00Z'); assert.equal((await f.service.index(f.driver)).organizations[0].assignments[0].status, 'pendiente');
});

test('revoking participation removes access and retains historical evidence for owner', async () => {
  const f = await fixture(); const a = await assign(f);
  await f.service.removeMember(f.org.id, f.driver, { memberId: f.driver });
  await assert.rejects(f.service.lesson(f.org.id, f.driver, a.id), /FORBIDDEN/);
  assert.equal((await f.service.index(f.driver)).organizations.length, 0);
  assert.equal((await f.service.index(f.owner)).organizations[0].assignments.length, 1);
});

test('production store persists with filtered reads and compare-and-swap RPC', async () => {
  const calls = []; const org = { id: randomUUID(), ownerId: randomUUID(), revision: 2 };
  const accountStore = { request: async (table, options) => { calls.push({ table, options }); return table.endsWith('_cas') ? false : [{ document: org }]; } };
  const store = new SupabaseAcademyStore(accountStore);
  assert.deepEqual(await store.getAcademyOrganization(org.id), org);
  assert.equal(calls[0].options.query.id, `eq.${org.id}`);
  await store.listAcademyOrganizations(org.ownerId);
  assert.equal(calls[1].options.body.actor_id, org.ownerId);
  assert.equal(await store.compareAndSwapAcademy(org, 2), false);
  assert.equal(calls[2].options.body.expected_revision, 2);
  assert.equal(calls[2].options.body.next_document.revision, 3);
});

test('HTTP: authentication, CSRF guard, static assets, and no raw store errors', async (t) => {
  const f = await fixture();
  const server = createPlatformServer({ auth: new StaticAuth(new Map([['owner', { id: f.owner }], ['driver', { id: f.driver }]])), academyService: f.service, staticDir: new URL('../public/', import.meta.url) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/academy`)).status, 401);
  assert.equal((await fetch(`${base}/api/academy/organizations`, { method: 'POST', headers: { Authorization: 'Bearer owner' }, body: '{}' })).status, 403);
  const dashboard = await fetch(`${base}/api/academy`, { headers: { Authorization: 'Bearer driver' } });
  assert.equal(dashboard.status, 200); assert.equal((await dashboard.json()).organizations[0].manager, false);
  const page = await fetch(`${base}/academia-flota`); assert.equal(page.status, 200); assert.match(await page.text(), /Asignar un curso/);
  assert.equal((await fetch(`${base}/academy/app.js`)).status, 200);
  f.store.listAcademyOrganizations = async () => { throw new Error('SECRET_RAW_DATABASE_ERROR'); };
  const failure = await fetch(`${base}/api/academy`, { headers: { Authorization: 'Bearer owner' } });
  assert.equal(failure.status, 503); assert.equal((await failure.json()).error, 'ACADEMY_UNAVAILABLE');
});
