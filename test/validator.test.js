import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/tuning.js';
import {
  computeMaxJumpHeight,
  computeMaxHorizontalReach,
  validateStage,
} from '../src/validator.js';
import { getStage } from '../src/level.js';

// --- computeMaxJumpHeight ---

test('max_jump_height_is_positive', () => {
  assert.ok(computeMaxJumpHeight(DEFAULTS) > 0);
});

test('max_jump_height_decreases_with_higher_gravity', () => {
  const low  = computeMaxJumpHeight({ ...DEFAULTS, gravity: 0.3 });
  const high = computeMaxJumpHeight({ ...DEFAULTS, gravity: 1.5 });
  assert.ok(low > high, 'lower gravity should allow higher jump');
});

test('max_jump_height_increases_with_stronger_jump_velocity', () => {
  const weak   = computeMaxJumpHeight({ ...DEFAULTS, jumpVelocity: -6  });
  const strong = computeMaxJumpHeight({ ...DEFAULTS, jumpVelocity: -18 });
  assert.ok(strong > weak);
});

test('max_jump_height_increases_with_more_hold_force', () => {
  const noHold   = computeMaxJumpHeight({ ...DEFAULTS, jumpHoldForce: 0 });
  const withHold = computeMaxJumpHeight({ ...DEFAULTS, jumpHoldForce: 1.5 });
  assert.ok(withHold > noHold);
});

test('max_jump_height_increases_with_more_hold_frames', () => {
  const few  = computeMaxJumpHeight({ ...DEFAULTS, jumpHoldMaxFrames: 2  });
  const many = computeMaxJumpHeight({ ...DEFAULTS, jumpHoldMaxFrames: 20 });
  assert.ok(many > few);
});

// --- computeMaxHorizontalReach ---

test('max_horizontal_reach_is_positive', () => {
  assert.ok(computeMaxHorizontalReach(DEFAULTS) > 0);
});

test('max_horizontal_reach_increases_with_higher_move_speed', () => {
  const slow = computeMaxHorizontalReach({ ...DEFAULTS, moveSpeed: 2 });
  const fast = computeMaxHorizontalReach({ ...DEFAULTS, moveSpeed: 8 });
  assert.ok(fast > slow);
});

test('max_horizontal_reach_increases_with_lower_gravity', () => {
  const low  = computeMaxHorizontalReach({ ...DEFAULTS, gravity: 0.3 });
  const high = computeMaxHorizontalReach({ ...DEFAULTS, gravity: 1.5 });
  assert.ok(low > high, 'lower gravity = longer airtime = more reach');
});

// --- validateStage ---

test('stage1_is_clearable_with_default_config', () => {
  const result = validateStage(getStage(1), DEFAULTS);
  assert.equal(result.clearable, true);
  assert.equal(result.issues.length, 0);
});

test('stage1_not_clearable_when_gravity_is_extreme', () => {
  const result = validateStage(getStage(1), { ...DEFAULTS, gravity: 2.0, jumpHoldForce: 0 });
  assert.equal(result.clearable, false);
  assert.ok(result.issues.length > 0);
});

test('stage1_not_clearable_when_jump_velocity_too_weak', () => {
  const result = validateStage(getStage(1), { ...DEFAULTS, jumpVelocity: -2, jumpHoldForce: 0 });
  assert.equal(result.clearable, false);
});

test('stage1_not_clearable_when_move_speed_too_slow_for_horizontal_gap', () => {
  // Gravity low enough to jump high but horizontal reach too short
  const result = validateStage(getStage(1), { ...DEFAULTS, moveSpeed: 0.5 });
  assert.equal(result.clearable, false);
  assert.ok(result.issues.some(i => i.type === 'too_far'));
});

test('validate_issues_contain_failing_step_label', () => {
  const result = validateStage(getStage(1), { ...DEFAULTS, jumpVelocity: -2, jumpHoldForce: 0 });
  assert.ok(result.issues[0].step, 'issue should reference the failing step');
});

test('validate_result_exposes_capabilities', () => {
  const result = validateStage(getStage(1), DEFAULTS);
  assert.ok(result.capabilities.maxJumpHeight > 0);
  assert.ok(result.capabilities.maxHorizontalReach > 0);
});

test('tutorial_stage_always_clearable_because_no_goal', () => {
  const result = validateStage(getStage(0), DEFAULTS);
  assert.equal(result.clearable, true);
});
