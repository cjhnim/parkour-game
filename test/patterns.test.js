import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/tuning.js';
import { validateStage } from '../src/validator.js';
import { dropStep, longGap, wallClimb, PATTERN_REGISTRY } from '../src/patterns.js';

function stageFromPattern(pattern, sourcePlatforms = []) {
  return {
    id: 99,
    name: 'pattern-test',
    spawn: { x: 0, y: 0 },
    route: pattern.route,
    solids: [...sourcePlatforms, ...pattern.platforms],
    goal: null,
  };
}

test('pattern_registry_exposes_three_patterns', () => {
  assert.equal(PATTERN_REGISTRY.dropStep, dropStep);
  assert.equal(PATTERN_REGISTRY.longGap, longGap);
  assert.equal(PATTERN_REGISTRY.wallClimb, wallClimb);
});

// --- shape ---

test('dropStep_right_returns_target_to_the_right_and_below', () => {
  const p = dropStep(150, 160, 1);
  const t = p.platforms[0];
  assert.ok(t.x > 150, 'target x should be to the right of takeoff');
  assert.ok(t.y > 160, 'target y should be below takeoff');
  assert.equal(p.route[0].takeoff.vxDir, 1);
});

test('dropStep_left_returns_target_to_the_left_and_below', () => {
  const p = dropStep(800, 160, -1);
  const t = p.platforms[0];
  assert.ok(t.x + t.w < 800, 'target right edge should be left of takeoff');
  assert.ok(t.y > 160, 'target y should be below takeoff');
  assert.equal(p.route[0].takeoff.vxDir, -1);
});

for (const [name, fn] of Object.entries({ longGap, wallClimb })) {
  test(`${name}_returns_platforms_route_bbox`, () => {
    const p = fn(0, 0);
    assert.ok(Array.isArray(p.platforms) && p.platforms.length > 0);
    assert.ok(Array.isArray(p.route) && p.route.length > 0);
    assert.equal(typeof p.bbox.x, 'number');
  });
}

// --- clearability at default offset ---

test('dropStep_right_clearable_at_default', () => {
  const p = dropStep(150, 160, 1);
  const r = validateStage(stageFromPattern(p), DEFAULTS);
  assert.equal(r.clearable, true, JSON.stringify(r.issues));
});

test('dropStep_left_clearable_at_default', () => {
  const p = dropStep(800, 160, -1);
  const r = validateStage(stageFromPattern(p), DEFAULTS);
  assert.equal(r.clearable, true, JSON.stringify(r.issues));
});

test('longGap_clearable_at_default', () => {
  const r = validateStage(stageFromPattern(longGap(0, 0)), DEFAULTS);
  assert.equal(r.clearable, true, JSON.stringify(r.issues));
});

test('wallClimb_clearable_at_default', () => {
  const r = validateStage(stageFromPattern(wallClimb(0, 0)), DEFAULTS);
  assert.equal(r.clearable, true, JSON.stringify(r.issues));
});

// --- translation invariance ---

const OFFSETS = [
  [16, 0],
  [-16, 0],
  [0, -32],
  [128, -64],
  [-80, 32],
];

for (const [ox, oy] of OFFSETS) {
  test(`dropStep_right_clearable_at_offset_${ox}_${oy}`, () => {
    const r = validateStage(stageFromPattern(dropStep(150 + ox, 160 + oy, 1)), DEFAULTS);
    assert.equal(r.clearable, true, JSON.stringify(r.issues));
  });

  test(`dropStep_left_clearable_at_offset_${ox}_${oy}`, () => {
    const r = validateStage(stageFromPattern(dropStep(800 + ox, 160 + oy, -1)), DEFAULTS);
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

// --- chaining: dropStep composes correctly ---

test('dropStep_chains_to_match_stage2_geometry', () => {
  // Reproduce Stage 2: takeoff at (150,160), step right, then chain twice more.
  const a = dropStep(150, 160, 1);
  const b = dropStep(a.platforms[0].x + a.platforms[0].w, a.platforms[0].y, 1);
  const c = dropStep(b.platforms[0].x + b.platforms[0].w, b.platforms[0].y, 1);
  assert.deepEqual({ x: a.platforms[0].x, y: a.platforms[0].y }, { x: 300, y: 280 });
  assert.deepEqual({ x: b.platforms[0].x, y: b.platforms[0].y }, { x: 550, y: 400 });
  assert.deepEqual({ x: c.platforms[0].x, y: c.platforms[0].y }, { x: 800, y: 520 });
});

test('chained_dropSteps_clearable_as_a_sequence', () => {
  const top = { x: 50, y: 160, w: 100, h: 16 };
  const a = dropStep(150, 160, 1);
  const b = dropStep(a.platforms[0].x + a.platforms[0].w, a.platforms[0].y, 1);
  const c = dropStep(b.platforms[0].x + b.platforms[0].w, b.platforms[0].y, 1);
  const stage = {
    id: 99, name: 'chain', spawn: { x: 0, y: 0 },
    route: [...a.route, ...b.route, ...c.route],
    solids: [top, ...a.platforms, ...b.platforms, ...c.platforms],
    goal: null,
  };
  assert.equal(validateStage(stage, DEFAULTS).clearable, true);
});

// --- dropStep parameterization ---

test('dropStep_default_dx_dy_matches_legacy_geometry', () => {
  const p = dropStep(150, 160, 1);
  assert.equal(p.platforms[0].x, 300);
  assert.equal(p.platforms[0].y, 280);
});

// NOTE: Very short jumps (small dx + small dy) are gameplay-feasible by
// releasing input mid-air, but the validator only checks max-vx trajectories.
// So short jumps may be rejected by validator even though playable. Tests
// below stick to validator-clearable cases.

test('dropStep_long_drop_clearable', () => {
  // Big drop: large dy gives more airtime, so larger dx is reachable.
  const p = dropStep(100, 100, 1, { dx: 300, dy: 400 });
  const r = validateStage(stageFromPattern(p), DEFAULTS);
  assert.equal(r.clearable, true, JSON.stringify(r.issues));
});

test('dropStep_too_far_at_zero_dy_rejected_by_validator', () => {
  // dx = 250 with dy=0 — exceeds maxHorizontalReach (~185). Player falls
  // off before reaching target.
  const p = dropStep(100, 300, 1, { dx: 250, dy: 0 });
  const r = validateStage(stageFromPattern(p), DEFAULTS);
  assert.equal(r.clearable, false);
});

test('dropStep_jump_up_clearable_within_max_jump_height', () => {
  // Negative dy = jump up. ~80px rise is comfortably under maxJumpHeight 114.
  const p = dropStep(100, 400, 1, { dx: 80, dy: -80 });
  const r = validateStage(stageFromPattern(p), DEFAULTS);
  assert.equal(r.clearable, true, JSON.stringify(r.issues));
});

test('dropStep_jump_up_too_high_rejected', () => {
  // dy beyond maxJumpHeight + PLAYER_H (≈138 at default physics) — bbox top
  // at peak still doesn't reach target's bottom edge.
  const p = dropStep(100, 400, 1, { dx: 50, dy: -200 });
  const r = validateStage(stageFromPattern(p), DEFAULTS);
  assert.equal(r.clearable, false);
});

test('dropStep_left_with_custom_dx_dy', () => {
  const p = dropStep(800, 200, -1, { dx: 100, dy: 80 });
  const t = p.platforms[0];
  assert.equal(t.x + t.w, 700, 'target right edge = ox - dx');
  assert.equal(t.y, 280);
  const r = validateStage(stageFromPattern(p), DEFAULTS);
  assert.equal(r.clearable, true);
});

// --- coordinate shift invariants ---

test('wallClimb_route_takeoff_shifts_by_offset', () => {
  const a = wallClimb(0, 0).route;
  const b = wallClimb(100, 50).route;
  for (let i = 0; i < a.length; i++) {
    assert.equal(b[i].takeoff.x, a[i].takeoff.x + 100);
    assert.equal(b[i].takeoff.y, a[i].takeoff.y + 50);
    assert.equal(b[i].takeoff.vxDir, a[i].takeoff.vxDir);
  }
});
