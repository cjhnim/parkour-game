import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/tuning.js';
import { validateStage } from '../src/validator.js';
import { dropZigzag, longGap, wallClimb, PATTERN_REGISTRY } from '../src/patterns.js';

function stageFromPattern(pattern) {
  return {
    id: 99,
    name: 'pattern-test',
    spawn: { x: 0, y: 0 },
    route: pattern.route,
    solids: pattern.platforms,
    goal: null,
  };
}

test('pattern_registry_exposes_three_patterns', () => {
  assert.equal(PATTERN_REGISTRY.dropZigzag, dropZigzag);
  assert.equal(PATTERN_REGISTRY.longGap, longGap);
  assert.equal(PATTERN_REGISTRY.wallClimb, wallClimb);
});

for (const [name, fn] of Object.entries({ dropZigzag, longGap, wallClimb })) {
  test(`${name}_returns_platforms_route_bbox`, () => {
    const p = fn(0, 0);
    assert.ok(Array.isArray(p.platforms) && p.platforms.length > 0);
    assert.ok(Array.isArray(p.route) && p.route.length > 0);
    assert.equal(typeof p.bbox.x, 'number');
    assert.equal(typeof p.bbox.y, 'number');
    assert.equal(typeof p.bbox.w, 'number');
    assert.equal(typeof p.bbox.h, 'number');
  });

  test(`${name}_clearable_at_default_offset`, () => {
    const p = fn(0, 0);
    const r = validateStage(stageFromPattern(p), DEFAULTS);
    assert.equal(r.clearable, true, JSON.stringify(r.issues));
  });
}

// Translation invariance — moving the entire pattern should not change
// validator outcome since jump physics depend on relative distances.
const OFFSETS = [
  [16, 0],
  [-16, 0],
  [0, -32],
  [128, -64],
  [-80, 32],
];

for (const [ox, oy] of OFFSETS) {
  test(`dropZigzag_clearable_at_offset_${ox}_${oy}`, () => {
    const r = validateStage(stageFromPattern(dropZigzag(ox, oy)), DEFAULTS);
    assert.equal(r.clearable, true, JSON.stringify(r.issues));
  });

  test(`longGap_clearable_at_offset_${ox}_${oy}`, () => {
    const r = validateStage(stageFromPattern(longGap(ox, oy)), DEFAULTS);
    assert.equal(r.clearable, true, JSON.stringify(r.issues));
  });

  test(`wallClimb_clearable_at_offset_${ox}_${oy}`, () => {
    const r = validateStage(stageFromPattern(wallClimb(ox, oy)), DEFAULTS);
    assert.equal(r.clearable, true, JSON.stringify(r.issues));
  });
}

test('pattern_platforms_shift_by_offset', () => {
  const a = dropZigzag(0, 0).platforms;
  const b = dropZigzag(100, 50).platforms;
  for (let i = 0; i < a.length; i++) {
    assert.equal(b[i].x, a[i].x + 100);
    assert.equal(b[i].y, a[i].y + 50);
    assert.equal(b[i].w, a[i].w);
    assert.equal(b[i].h, a[i].h);
  }
});

test('pattern_route_takeoff_shifts_by_offset', () => {
  const a = wallClimb(0, 0).route;
  const b = wallClimb(100, 50).route;
  for (let i = 0; i < a.length; i++) {
    assert.equal(b[i].takeoff.x, a[i].takeoff.x + 100);
    assert.equal(b[i].takeoff.y, a[i].takeoff.y + 50);
    assert.equal(b[i].takeoff.vxDir, a[i].takeoff.vxDir);
  }
});
