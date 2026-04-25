import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGravity,
  accelerateVx,
  tryJump,
  tryWallJump,
} from '../src/physics.js';
import { DEFAULTS } from '../src/tuning.js';

test('gravity_increases_vertical_velocity_each_step', () => {
  assert.equal(applyGravity(0), DEFAULTS.gravity);
  assert.equal(applyGravity(1), 1 + DEFAULTS.gravity);
});

test('gravity_caps_at_max_fall_speed', () => {
  assert.equal(applyGravity(DEFAULTS.maxFallSpeed + 5), DEFAULTS.maxFallSpeed);
});

test('wall_slide_caps_falling_speed_lower_than_normal', () => {
  const result = applyGravity(DEFAULTS.maxFallSpeed, true);
  assert.equal(result, DEFAULTS.wallSlideMaxFall);
  assert.ok(result < DEFAULTS.maxFallSpeed);
});

test('jump_only_applies_when_grounded', () => {
  assert.equal(tryJump(0, true), DEFAULTS.jumpVelocity);
  assert.equal(tryJump(5, false), 5); // unchanged in air
});

test('wall_jump_pushes_away_from_left_wall', () => {
  const r = tryWallJump(0, 5, -1);
  assert.ok(r.vx > 0, 'should push right');
  assert.ok(r.vy < 0, 'should push up');
});

test('wall_jump_pushes_away_from_right_wall', () => {
  const r = tryWallJump(0, 5, 1);
  assert.ok(r.vx < 0, 'should push left');
  assert.ok(r.vy < 0, 'should push up');
});

test('wall_jump_no_effect_without_wall', () => {
  const r = tryWallJump(3, 5, 0);
  assert.deepEqual(r, { vx: 3, vy: 5 });
});

// --- accelerateVx ---

test('accelerate_vx_increases_toward_max_when_right_held', () => {
  const vx = accelerateVx(0, { left: false, right: true });
  assert.ok(vx > 0, 'vx should increase');
});

test('accelerate_vx_decreases_toward_zero_when_no_input', () => {
  const vx = accelerateVx(4, { left: false, right: false });
  assert.ok(vx < 4, 'friction should slow down');
  assert.ok(vx >= 0, 'should not go negative');
});

test('accelerate_vx_caps_at_move_speed', () => {
  // Apply many frames of right input
  let vx = 0;
  for (let i = 0; i < 100; i++) vx = accelerateVx(vx, { left: false, right: true });
  assert.equal(vx, DEFAULTS.moveSpeed);
});

test('accelerate_vx_snaps_to_zero_when_nearly_stopped', () => {
  // Very small vx should snap to 0 after friction
  const vx = accelerateVx(0.05, { left: false, right: false });
  assert.equal(vx, 0);
});

test('accelerate_vx_can_reverse_direction', () => {
  // Moving right, press left → should decelerate and eventually go negative
  let vx = DEFAULTS.moveSpeed;
  for (let i = 0; i < 30; i++) vx = accelerateVx(vx, { left: true, right: false });
  assert.ok(vx < 0, 'should eventually move left');
});
