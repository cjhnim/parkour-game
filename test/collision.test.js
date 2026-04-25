import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intersects, resolveMovement } from '../src/collision.js';

const floor = { x: 0, y: 100, w: 200, h: 20 };
const leftWall = { x: 0, y: 0, w: 20, h: 200 };
const rightWall = { x: 180, y: 0, w: 20, h: 200 };

test('intersects_returns_true_for_overlapping_boxes', () => {
  assert.equal(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
});

test('intersects_returns_false_for_disjoint_boxes', () => {
  assert.equal(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 }), false);
});

test('intersects_returns_false_when_only_touching_edges', () => {
  // touching edges should not count as overlap
  assert.equal(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
});

test('player_stops_when_falling_onto_floor', () => {
  const prev = { x: 50, y: 80, w: 20, h: 20 }; // bottom at 100, just above floor
  const r = resolveMovement(prev, { vx: 0, vy: 5 }, [floor]);
  assert.equal(r.grounded, true);
  assert.equal(r.pos.y, 80, 'stays on top of floor (y = floor.y - h = 100-20)');
  assert.equal(r.vel.vy, 0);
});

test('player_grounded_false_when_in_air', () => {
  const prev = { x: 50, y: 0, w: 20, h: 20 };
  const r = resolveMovement(prev, { vx: 0, vy: 5 }, [floor]);
  assert.equal(r.grounded, false);
  assert.equal(r.pos.y, 5);
});

test('player_blocked_by_right_wall_records_wall_side_positive', () => {
  const prev = { x: 150, y: 50, w: 20, h: 20 };
  const r = resolveMovement(prev, { vx: 20, vy: 0 }, [rightWall]);
  assert.equal(r.wallSide, 1);
  assert.equal(r.pos.x, 160, 'pushed flush against wall (180 - 20)');
  assert.equal(r.vel.vx, 0);
});

test('player_blocked_by_left_wall_records_wall_side_negative', () => {
  const prev = { x: 25, y: 50, w: 20, h: 20 };
  const r = resolveMovement(prev, { vx: -20, vy: 0 }, [leftWall]);
  assert.equal(r.wallSide, -1);
  assert.equal(r.pos.x, 20, 'pushed flush against wall (leftWall right edge)');
  assert.equal(r.vel.vx, 0);
});

test('player_blocked_by_ceiling_when_jumping_up', () => {
  const ceiling = { x: 0, y: 0, w: 200, h: 20 };
  const prev = { x: 50, y: 25, w: 20, h: 20 };
  const r = resolveMovement(prev, { vx: 0, vy: -10 }, [ceiling]);
  assert.equal(r.pos.y, 20, 'snaps below ceiling');
  assert.equal(r.vel.vy, 0);
  assert.equal(r.grounded, false);
});

test('no_collision_no_change_to_velocity', () => {
  const prev = { x: 50, y: 50, w: 20, h: 20 };
  const r = resolveMovement(prev, { vx: 3, vy: 2 }, []);
  assert.deepEqual(r.pos, { x: 53, y: 52 });
  assert.deepEqual(r.vel, { vx: 3, vy: 2 });
  assert.equal(r.grounded, false);
  assert.equal(r.wallSide, 0);
});
