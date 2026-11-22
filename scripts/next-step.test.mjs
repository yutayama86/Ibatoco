import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentGroup, selectNextSteps } from '../src/lib/next-step.mjs';

test('slug assignment is deterministic and independent of runtime randomness', () => {
  for (const slug of ['oarai-ankou-matsuri-2026', 'hitachinaka-coffee-festival-2026', 'tokai-imo-fes-2026']) {
    assert.equal(experimentGroup(slug), experimentGroup(slug));
    assert.match(experimentGroup(slug), /^[AB]$/);
  }
  const groups = new Set(Array.from({ length: 100 }, (_, i) => experimentGroup(`event-${i}`)));
  assert.deepEqual([...groups].sort(), ['A', 'B']);
});

test('selects at most one link per kind in intended order and excludes ended/noindex/self/duplicates', () => {
  const current = { path: '/events/current/' };
  const candidates = [
    { kind: 'access', path: '/events/current/', title: 'self' },
    { kind: 'access', path: '/events/noindex/', title: 'noindex', noindex: true },
    { kind: 'access', path: '/events/access/', title: 'access', eventLifecycle: 'evergreen' },
    { kind: 'nearby', path: '/events/ended/', title: 'ended', eventLifecycle: 'ended' },
    { kind: 'nearby', path: '/events/nearby/', title: 'nearby', eventLifecycle: 'upcoming' },
    { kind: 'next', path: '/events/nearby/', title: 'duplicate', eventLifecycle: 'upcoming' },
    { kind: 'next', path: '/events/next/', title: 'next', eventLifecycle: 'upcoming' },
  ];
  assert.deepEqual(selectNextSteps(current, candidates).map((v) => v.path), ['/events/access/', '/events/nearby/', '/events/next/']);
  assert.equal(selectNextSteps(current, candidates, 2).length, 2);
});

test('does not link to cancelled, postponed or unconfirmed events', () => {
  const current = { path: '/events/current/' };
  const candidates = ['ended', 'cancelled', 'postponed', 'unconfirmed'].map((state) => ({
    kind: 'next', path: `/events/${state}/`, title: state, eventLifecycle: state,
  }));
  assert.deepEqual(selectNextSteps(current, candidates), []);
});
