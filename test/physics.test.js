import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGravity,
  computeVx,
  accelerateVx,
  tryJump,
  tryWallJump,
  step,
  GRAVITY,
  MAX_FALL_SPEED,
  WALL_SLIDE_MAX_FALL,
  MOVE_SPEED,
  JUMP_VELOCITY,
} from '../src/physics.js';

test('gravity_increases_vertical_velocity_each_step', () => {
  assert.equal(applyGravity(0), GRAVITY);
  assert.equal(applyGravity(1), 1 + GRAVITY);
});

test('gravity_caps_at_max_fall_speed', () => {
  assert.equal(applyGravity(MAX_FALL_SPEED + 5), MAX_FALL_SPEED);
});

test('wall_slide_caps_falling_speed_lower_than_normal', () => {
  const result = applyGravity(MAX_FALL_SPEED, true);
  assert.equal(result, WALL_SLIDE_MAX_FALL);
  assert.ok(result < MAX_FALL_SPEED);
});

test('horizontal_velocity_is_zero_when_no_input', () => {
  assert.equal(computeVx({ left: false, right: false }), 0);
});

test('horizontal_velocity_is_negative_when_left_pressed', () => {
  assert.equal(computeVx({ left: true, right: false }), -MOVE_SPEED);
});

test('horizontal_velocity_is_positive_when_right_pressed', () => {
  assert.equal(computeVx({ left: false, right: true }), MOVE_SPEED);
});

test('horizontal_velocity_cancels_when_both_pressed', () => {
  assert.equal(computeVx({ left: true, right: true }), 0);
});

test('jump_only_applies_when_grounded', () => {
  assert.equal(tryJump(0, true), JUMP_VELOCITY);
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

test('step_integrates_position_with_velocity', () => {
  assert.deepEqual(step({ x: 10, y: 20 }, { vx: 3, vy: -4 }), { x: 13, y: 16 });
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
  assert.equal(vx, MOVE_SPEED);
});

test('accelerate_vx_snaps_to_zero_when_nearly_stopped', () => {
  // Very small vx should snap to 0 after friction
  const vx = accelerateVx(0.05, { left: false, right: false });
  assert.equal(vx, 0);
});

test('accelerate_vx_can_reverse_direction', () => {
  // Moving right, press left → should decelerate and eventually go negative
  let vx = MOVE_SPEED;
  for (let i = 0; i < 30; i++) vx = accelerateVx(vx, { left: true, right: false });
  assert.ok(vx < 0, 'should eventually move left');
});

