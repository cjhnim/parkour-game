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

test('stage2_drop_is_clearable_with_default_config', () => {
  const result = validateStage(getStage(2), DEFAULTS);
  assert.equal(result.clearable, true);
});

test('stage3_long_gap_is_clearable_with_default_config', () => {
  const result = validateStage(getStage(3), DEFAULTS);
  assert.equal(result.clearable, true);
});

test('stage4_climb_is_clearable_with_default_config', () => {
  const result = validateStage(getStage(4), DEFAULTS);
  assert.equal(result.clearable, true);
});

test('stage1_not_clearable_when_gravity_is_extreme', () => {
  const result = validateStage(getStage(1), { ...DEFAULTS, gravity: 2.0 });
  assert.equal(result.clearable, false);
  assert.ok(result.issues.length > 0);
});

test('stage1_not_clearable_when_jump_velocity_too_weak', () => {
  const result = validateStage(getStage(1), { ...DEFAULTS, jumpVelocity: -2 });
  assert.equal(result.clearable, false);
});

test('stage1_not_clearable_when_move_speed_too_slow_for_horizontal_gap', () => {
  // Gravity low enough to jump high but horizontal reach too short
  const result = validateStage(getStage(1), { ...DEFAULTS, moveSpeed: 0.5 });
  assert.equal(result.clearable, false);
  assert.ok(result.issues.some(i => i.type === 'too_far'));
});

test('validate_issues_contain_failing_step_label', () => {
  const result = validateStage(getStage(1), { ...DEFAULTS, jumpVelocity: -2 });
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


// --- combined parabolic check ---

// Vertical and horizontal capabilities checked together, not independently.
// A step where each is individually feasible may still fail because the
// player can't be at the target height and target x simultaneously.
test('combined_check_rejects_step_unreachable_in_single_jump', () => {
  // Target is high enough that bbox can overlap during descent, but the player
  // cannot reach the target horizontally before falling past its y range.
  const stage = {
    id: 99, name: 'combo', spawn: { x: 0, y: 0 },
    route: [{
      label: 'tight', type: 'jump',
      takeoff: { x: 0, y: 300, vxDir: 1 },
      targetPlatform: { x: 200, y: 190, w: 100, h: 16 },
    }],
    solids: [], goal: null,
  };
  const result = validateStage(stage, DEFAULTS);
  assert.equal(result.clearable, false);
  assert.equal(result.issues[0].type, 'too_far');
});


// --- wall-touch step ---

test('wall_touch_step_clearable_when_within_reach', () => {
  const stage = {
    id: 99, name: 'wt', spawn: { x: 0, y: 0 },
    route: [{ label: 'wall', type: 'wall-touch', horizontalGap: 100 }],
    solids: [], goal: null,
  };
  assert.equal(validateStage(stage, DEFAULTS).clearable, true);
});

test('wall_touch_step_fails_when_unreachable', () => {
  const stage = {
    id: 99, name: 'wt', spawn: { x: 0, y: 0 },
    route: [{ label: 'wall', type: 'wall-touch', horizontalGap: 99999 }],
    solids: [], goal: null,
  };
  const result = validateStage(stage, DEFAULTS);
  assert.equal(result.clearable, false);
  assert.equal(result.issues[0].type, 'too_far');
});


// --- wall-jump-land step ---

test('wall_jump_land_lands_on_nearby_target', () => {
  const stage = {
    id: 99, name: 'wjl', spawn: { x: 0, y: 0 },
    route: [{
      label: 'wj',
      type: 'wall-jump-land',
      wallX: 940, wallTouchY: 300, wallSide: 1,
      targetPlatform: { x: 700, y: 320, w: 100 },
    }],
    solids: [], goal: null,
  };
  assert.equal(validateStage(stage, DEFAULTS).clearable, true);
});

// --- jump step: bbox-overlap also counts side-face contact as reachable ---

test('jump_succeeds_via_side_face_contact', () => {
  // P4 left edge → Goal platform's left face (Stage 1 wall-jump route).
  // Player feet never lands on top during the trajectory, but bbox overlaps
  // goal's left face — counts as reachable since wall-cling + wall-jump clears.
  const stage = {
    id: 99, name: 'scc', spawn: { x: 0, y: 0 },
    route: [{
      label: 'P4→Goal', type: 'jump',
      takeoff: { x: 482, y: 240, vxDir: 1 },
      targetPlatform: { x: 560, y: 110, w: 200, h: 16 },
    }],
    solids: [], goal: null,
  };
  assert.equal(validateStage(stage, DEFAULTS).clearable, true);
});

test('jump_fails_when_target_too_high_for_bbox_overlap', () => {
  // Target above max jump height (even with bbox extension upward).
  const stage = {
    id: 99, name: 'too-high', spawn: { x: 0, y: 0 },
    route: [{
      label: 'too high', type: 'jump',
      takeoff: { x: 482, y: 240, vxDir: 1 },
      targetPlatform: { x: 560, y: 0, w: 200, h: 16 },
    }],
    solids: [], goal: null,
  };
  const result = validateStage(stage, DEFAULTS);
  assert.equal(result.clearable, false);
  assert.equal(result.issues[0].type, 'too_high');
});


test('wall_jump_land_fails_when_target_out_of_range', () => {
  const stage = {
    id: 99, name: 'wjl', spawn: { x: 0, y: 0 },
    route: [{
      label: 'wj',
      type: 'wall-jump-land',
      wallX: 940, wallTouchY: 300, wallSide: 1,
      targetPlatform: { x: 100, y: 100, w: 50 }, // too far + too high
    }],
    solids: [], goal: null,
  };
  assert.equal(validateStage(stage, DEFAULTS).clearable, false);
});
