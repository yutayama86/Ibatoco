import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentGroup, selectNextSteps } from '../src/lib/next-step.mjs';

test('cohort assignment is deterministic', () => {
  for (const slug of ['ibaraki-event-2026', 'tokai-imo-fes-2026', 'foo']) {
    assert.equal(experimentGroup(slug), experimentGroup(slug));
    assert.match(experimentGroup(slug), /^[AB]$/);
  }
});
test('selection excludes self, noindex, ended and duplicates', () => {
  const current = { path: '/events/foo/' };
  const items = [
    { path: '/events/foo/', kind: 'access', title: 'self' },
    { path: '/events/ended/', kind: 'access', title: 'ended', eventLifecycle: 'ended' },
    { path: '/events/hidden/', kind: 'access', title: 'hidden', noindex: true },
    { path: '/guide/rail/', kind: 'access', title: 'Rail' },
    { path: '/guide/rail/', kind: 'nearby', title: 'Duplicate' },
    { path: '/events/nearby/', kind: 'nearby', title: 'Nearby' },
    { path: '/events/next/', kind: 'next', title: 'Next' },
  ];
  assert.deepEqual(selectNextSteps(current, items).map((x) => x.kind), ['access', 'nearby', 'next']);
  assert.equal(selectNextSteps(current, items).length, 3);
});
