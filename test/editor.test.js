import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/tuning.js';
import { computeReachArcs, snapToGrid, GRID } from '../src/editor.js';

// --- snapToGrid ---

test('snap_to_grid_rounds_to_nearest_grid_cell', () => {
  // JS Math.round rounds half toward +Infinity, so -0.5 → 0 (not -1).
  assert.equal(snapToGrid(0), 0);
  assert.equal(snapToGrid(7), 0);
  assert.equal(snapToGrid(8), 16);
  assert.equal(snapToGrid(15), 16);
  assert.equal(snapToGrid(16), 16);
  assert.equal(snapToGrid(-7), 0);
  assert.equal(snapToGrid(-9), -16);
});

test('snap_to_grid_uses_default_grid_size_16', () => {
  assert.equal(GRID, 16);
});


// --- computeReachArcs ---

test('reach_arcs_start_at_cursor_position', () => {
  const cursor = { x: 100, y: 200 };
  const arcs = computeReachArcs(cursor, 1, DEFAULTS);
  assert.deepEqual(arcs.outer[0], cursor);
  assert.deepEqual(arcs.inner[0], cursor);
});

test('inner_arc_stays_at_cursor_x_throughout', () => {
  const cursor = { x: 100, y: 200 };
  const { inner } = computeReachArcs(cursor, 1, DEFAULTS);
  for (const p of inner) {
    assert.equal(p.x, 100, 'vertical-only arc should never move horizontally');
  }
});

test('outer_arc_moves_right_when_facing_right', () => {
  const cursor = { x: 100, y: 200 };
  const { outer } = computeReachArcs(cursor, 1, DEFAULTS);
  for (let i = 1; i < outer.length; i++) {
    assert.ok(outer[i].x > outer[i - 1].x, 'outer x must strictly increase rightward');
  }
});

test('outer_arc_moves_left_when_facing_left', () => {
  const cursor = { x: 500, y: 200 };
  const { outer } = computeReachArcs(cursor, -1, DEFAULTS);
  for (let i = 1; i < outer.length; i++) {
    assert.ok(outer[i].x < outer[i - 1].x, 'outer x must strictly decrease leftward');
  }
});

test('arcs_terminate_when_falling_far_below_cursor', () => {
  const cursor = { x: 100, y: 200 };
  const { outer, inner } = computeReachArcs(cursor, 1, DEFAULTS);
  const lastOuter = outer[outer.length - 1];
  const lastInner = inner[inner.length - 1];
  assert.ok(lastOuter.y > cursor.y + 100, 'outer arc should descend well below cursor');
  assert.ok(lastInner.y > cursor.y + 100, 'inner arc should descend well below cursor');
});

test('higher_gravity_produces_shorter_horizontal_reach', () => {
  const cursor = { x: 100, y: 200 };
  const lowG  = computeReachArcs(cursor, 1, { ...DEFAULTS, gravity: 0.3 });
  const highG = computeReachArcs(cursor, 1, { ...DEFAULTS, gravity: 1.5 });
  const lowMaxX  = Math.max(...lowG.outer.map(p => p.x));
  const highMaxX = Math.max(...highG.outer.map(p => p.x));
  assert.ok(lowMaxX > highMaxX, 'lower gravity = longer airtime = farther reach');
});

test('faster_move_speed_extends_outer_arc_horizontally', () => {
  const cursor = { x: 100, y: 200 };
  const slow = computeReachArcs(cursor, 1, { ...DEFAULTS, moveSpeed: 2 });
  const fast = computeReachArcs(cursor, 1, { ...DEFAULTS, moveSpeed: 8 });
  const slowMaxX = Math.max(...slow.outer.map(p => p.x));
  const fastMaxX = Math.max(...fast.outer.map(p => p.x));
  assert.ok(fastMaxX > slowMaxX);
});

test('arcs_reach_at_least_max_jump_height_above_cursor', () => {
  const cursor = { x: 100, y: 400 };
  const { outer, inner } = computeReachArcs(cursor, 1, DEFAULTS);
  const minY = Math.min(...outer.map(p => p.y), ...inner.map(p => p.y));
  // jumpVelocity=-13, gravity=0.7 → max jump ≈ 114px above takeoff
  assert.ok(cursor.y - minY > 100, 'peak should be at least 100px above cursor');
});

test('facing_zero_or_positive_treated_as_right', () => {
  const cursor = { x: 100, y: 200 };
  const right = computeReachArcs(cursor, 1, DEFAULTS);
  const zero  = computeReachArcs(cursor, 0, DEFAULTS);
  // Both should produce outer arcs going right
  assert.ok(right.outer[10].x > 100);
  assert.ok(zero.outer[10].x > 100);
});
