// node --test tests/core.test.mjs   (Node 18+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const VB = require('../src/core.js');
const OSGB = require('../src/osgb.js');
VB.init(JSON.parse(readFileSync(new URL('../data/na1_isopleths_web.json', import.meta.url))));

test('matches the Python reference values within 0.02 m/s', () => {
  const ref = JSON.parse(readFileSync(new URL('./reference_points.json', import.meta.url)));
  for (const [e, n, v] of ref) assert.ok(Math.abs(VB.vbmap(e / 1000, n / 1000).v - v) <= 0.02, `${e},${n}`);
});
test('London Bridge', () => assert.equal(VB.vbmap(532.5, 180.5).v, 21.59));
test('special cases', () => {
  assert.deepEqual(VB.vbmap(451.3, 206.2).flags, ['inside_21.5_ring']);
  assert.equal(VB.vbmap(392.204, -79.208).v, 24);
});
test('grid references', () => {
  assert.equal(OSGB.toGridRef(532500, 180500), 'TQ 32500 80500');
  assert.deepEqual(OSGB.fromGridRef('TQ 32500 80500'), [532500.5, 180500.5]);
});
test('lat/long round trip within 1 m', () => {
  const [E, N] = OSGB.llToEN(51.5079, -0.0877), [la, lo] = OSGB.enToLL(E, N);
  assert.ok(Math.abs(la - 51.5079) < 1e-5 && Math.abs(lo + 0.0877) < 1e-5);
});
