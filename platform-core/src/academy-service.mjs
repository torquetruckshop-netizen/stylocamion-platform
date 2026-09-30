import { createHash, randomBytes, randomUUID } from 'node:crypto';

const DAY = 86400000;
const fail = (code) => { throw new Error(`ACADEMY_${code}`); };
const hash = (token) => createHash('sha256').update(token).digest('hex');
const clean = (value, max = 100) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('INPUT_INVALID');
  return value.trim();
};
const validId = (id) => {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) fail('INPUT_INVALID');
  return id;
};

// Reviewed course versions are immutable. Assignments retain their full snapshot.
export class AcademyService {
  constructor({ store, courses = [], pilotOwnerIds = new Set(), clock = () => new Date() }) {
    this.store = store;
    this.courses = courses;
    this.pilotOwnerIds = pilotOwnerIds;
    this.clock = clock;
  }

  published() {
    return this.courses.filter((course) => course.status === 'reviewed' && course.reviewedBy && course.reviewedAt
      && course.id && course.version && course.title && course.lessons?.length && course.questions?.length === 5
      && course.questions.every((q) => q.options?.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length));
  }

  async index(userId) {
    const orgs = await this.store.listAcademyOrganizations(userId);
    return { canCreate: this.pilotOwnerIds.has(userId), organizations: orgs.map((org) => this.view(org, userId)),
      courses: this.published().map(({ id, title, version, minutes }) => ({ id, title, version, minutes })) };
  }

  async create(userId, { name, country = 'AR' }) {
    if (!this.pilotOwnerIds.has(userId)) fail('PILOT_FORBIDDEN');
    if (country !== 'AR') fail('COUNTRY_INVALID');
    const { profile } = await this.store.getUserSummary(userId);
    if (!profile) fail('ACCOUNT_REQUIRED');
    const org = { id: randomUUID(), ownerId: userId, name: clean(name), country, locale: 'es-AR',
      createdAt: this.clock().toISOString(), revision: 0, members: {}, invites: {}, assignments: {}, events: [] };
    await this.store.createAcademyOrganization(org);
    return this.view(org, userId);
  }

  async read(id, userId) {
    const org = await this.store.getAcademyOrganization(validId(id));
    if (!org || !(org.ownerId === userId || org.members[userId]?.active)) fail('FORBIDDEN');
    return org;
  }

  async mutate(id, userId, fn, joining = false) {
    validId(id);
    for (let n = 0; n < 4; n++) {
      const org = joining ? await this.store.getAcademyOrganization(id) : await this.read(id, userId);
      if (!org) fail('FORBIDDEN');
      const output = fn(org);
      if (await this.store.compareAndSwapAcademy(org, org.revision)) return output;
    }
    fail('CONFLICT');
  }

  event(org, actor, action, target) {
    if (org.events.length >= 2000) fail('PILOT_LIMIT');
    org.events.push({ at: this.clock().toISOString(), actor, action, target });
  }

  owner(org, userId) { if (org.ownerId !== userId) fail('FORBIDDEN'); }

  async invite(id, userId) {
    const token = randomBytes(32).toString('base64url');
    return this.mutate(id, userId, (org) => {
      this.owner(org, userId);
      for (const [key, invite] of Object.entries(org.invites)) {
        if (new Date(invite.expiresAt) <= this.clock()) delete org.invites[key];
      }
      if (Object.keys(org.invites).length >= 50) fail('PILOT_LIMIT');
      const expiresAt = new Date(this.clock().getTime() + 7 * DAY).toISOString();
      org.invites[hash(token)] = { expiresAt };
      this.event(org, userId, 'invite.created', null);
      return { token, expiresAt, organizationId: org.id, name: org.name };
    });
  }

  async invitation(id, token) {
    const org = await this.store.getAcademyOrganization(validId(id));
    this.requireInvite(org, token);
    return { id: org.id, name: org.name };
  }

  requireInvite(org, token) {
    if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) fail('INVITE_INVALID');
    const invite = org?.invites[hash(token)];
    if (!invite || new Date(invite.expiresAt) <= this.clock()) fail('INVITE_INVALID');
  }

  async join(id, userId, { token, consent }) {
    if (consent !== true) fail('CONSENT_REQUIRED');
    const { profile } = await this.store.getUserSummary(userId);
    if (!profile?.displayName) fail('ACCOUNT_REQUIRED');
    return this.mutate(id, userId, (org) => {
      this.requireInvite(org, token);
      if (org.ownerId === userId) fail('OWNER_ALREADY_MEMBER');
      if (!org.members[userId] && Object.keys(org.members).length >= 50) fail('PILOT_LIMIT');
      org.members[userId] = { name: profile.displayName, active: true, consentAt: this.clock().toISOString(), consentVersion: 'academy-flota-v1' };
      delete org.invites[hash(token)];
      this.event(org, userId, 'member.joined', userId);
      return this.view(org, userId);
    }, true);
  }

  async removeMember(id, userId, { memberId }) {
    return this.mutate(id, userId, (org) => {
      if (org.ownerId !== userId && userId !== memberId) fail('FORBIDDEN');
      if (!org.members[memberId]) fail('MEMBER_INVALID');
      org.members[memberId].active = false;
      this.event(org, userId, 'member.deactivated', memberId);
      return { removed: true };
    });
  }

  async assign(id, userId, { memberId, courseId, dueDate, refreshDays = 90 }) {
    const course = this.published().find((item) => item.id === courseId);
    if (!course) fail('COURSE_NOT_REVIEWED');
    if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) fail('DATE_INVALID');
    const dueAt = `${dueDate}T23:59:59-03:00`;
    if (!Number.isFinite(Date.parse(dueAt)) || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate
      || Date.parse(dueAt) <= this.clock().getTime()) fail('DATE_INVALID');
    if (!Number.isInteger(refreshDays) || refreshDays < 7 || refreshDays > 365) fail('REFRESH_INVALID');
    return this.mutate(id, userId, (org) => {
      this.owner(org, userId);
      if (!org.members[memberId]?.active) fail('MEMBER_INVALID');
      if (Object.keys(org.assignments).length >= 200) fail('PILOT_LIMIT');
      if (Object.values(org.assignments).some((a) => a.memberId === memberId && a.course.id === courseId
        && (!a.completedAt || new Date(a.refreshAt) > this.clock()))) fail('ASSIGNMENT_EXISTS');
      const assignment = { id: randomUUID(), memberId, learnerName: org.members[memberId].name,
        course: structuredClone(course), assignedAt: this.clock().toISOString(), dueAt, refreshDays,
        attempts: 0, score: null, completedAt: null, refreshAt: null, lastAttemptAt: null };
      org.assignments[assignment.id] = assignment;
      this.event(org, userId, 'course.assigned', assignment.id);
      return this.assignmentView(assignment);
    });
  }

  async lesson(id, userId, assignmentId) {
    const org = await this.read(id, userId);
    const a = org.assignments[assignmentId];
    if (!a || (a.memberId !== userId && org.ownerId !== userId)) fail('FORBIDDEN');
    const { questions, ...course } = a.course;
    return { assignment: this.assignmentView(a), course: { ...course,
      questions: questions.map(({ prompt, options }) => ({ prompt, options })) } };
  }

  async submit(id, userId, assignmentId, { answers, acknowledged }) {
    return this.mutate(id, userId, (org) => {
      const a = org.assignments[assignmentId];
      if (!a || a.memberId !== userId || !org.members[userId]?.active) fail('FORBIDDEN');
      if (a.completedAt) return this.assignmentView(a);
      if (acknowledged !== true) fail('ACKNOWLEDGEMENT_REQUIRED');
      if (!Array.isArray(answers) || answers.length !== a.course.questions.length
        || answers.some((answer, i) => !Number.isInteger(answer) || answer < 0 || answer >= a.course.questions[i].options.length)) fail('ANSWERS_INVALID');
      const now = this.clock();
      if (a.lastAttemptAt && now - new Date(a.lastAttemptAt) < 60000) fail('RETRY_LATER');
      a.score = Math.round(answers.filter((answer, i) => answer === a.course.questions[i].answer).length / answers.length * 100);
      a.attempts += 1;
      a.lastAttemptAt = now.toISOString();
      if (a.score >= 80) {
        a.completedAt = now.toISOString();
        a.refreshAt = new Date(now.getTime() + a.refreshDays * DAY).toISOString();
      }
      this.event(org, userId, a.completedAt ? 'course.completed' : 'course.needs-refresher', a.id);
      return this.assignmentView(a);
    });
  }

  async certificate(id, userId, assignmentId) {
    const org = await this.read(id, userId);
    const a = org.assignments[assignmentId];
    if (!a || (org.ownerId !== userId && a.memberId !== userId)) fail('FORBIDDEN');
    if (!a.completedAt) fail('NOT_COMPLETED');
    return { number: a.id, organization: org.name, learner: a.learnerName,
      title: a.course.title, version: a.course.version, completedAt: a.completedAt, score: a.score,
      statement: 'Constancia de realización de un contenido teórico y su evaluación. No certifica aptitud, habilitación profesional ni cumplimiento legal. No acredita una práctica presencial.' };
  }

  assignmentView(a) {
    let status = a.attempts ? 'refuerzo' : 'pendiente';
    if (a.completedAt) status = new Date(a.refreshAt) <= this.clock() ? 'pendiente'
      : new Date(a.refreshAt) - this.clock() <= 7 * DAY ? 'por-vencer' : 'al-dia';
    return { id: a.id, memberId: a.memberId, learnerName: a.learnerName, courseId: a.course.id,
      title: a.course.title, version: a.course.version, assignedAt: a.assignedAt, dueAt: a.dueAt,
      refreshAt: a.refreshAt, completedAt: a.completedAt, score: a.score, attempts: a.attempts, status,
      overdue: !a.completedAt && new Date(a.dueAt) < this.clock() };
  }

  view(org, userId) {
    const manager = org.ownerId === userId;
    return { id: org.id, name: org.name, country: org.country, manager,
      members: manager ? Object.entries(org.members).map(([id, member]) => ({ id, ...member })) : [],
      assignments: Object.values(org.assignments).filter((a) => manager || a.memberId === userId).map((a) => this.assignmentView(a)) };
  }
}
