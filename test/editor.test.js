import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/tuning.js';
import {
  computeReachArcs, snapToGrid, GRID, TILE, GOAL_SIZE,
  createEditorState, setEditorActive, moveCursor, toggleMode,
  toggleTile, setSpawn, setGoal, serializeStage, createBlankStage,
} from '../src/editor.js';

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

test('arc_terminates_when_trajectory_enters_a_solid', () => {
  // Place a tall wall just to the right of cursor — outer arc going right
  // should stop on contact instead of passing through.
  const cursor = { x: 100, y: 200 };
  const wall = { x: 150, y: 0, w: 16, h: 400 };
  const arcs = computeReachArcs(cursor, 1, DEFAULTS, [wall]);
  const last = arcs.outer[arcs.outer.length - 1];
  assert.ok(last.x <= wall.x + 16, 'arc should not pass through the wall');
  // Without the wall, arc reaches further
  const noWall = computeReachArcs(cursor, 1, DEFAULTS, []);
  const noWallLast = noWall.outer[noWall.outer.length - 1];
  assert.ok(noWallLast.x > wall.x + 16, 'unblocked arc reaches past the wall x');
});

test('arc_with_no_solids_matches_arc_with_empty_array', () => {
  const cursor = { x: 100, y: 200 };
  const a = computeReachArcs(cursor, 1, DEFAULTS);
  const b = computeReachArcs(cursor, 1, DEFAULTS, []);
  assert.deepEqual(a.outer, b.outer);
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


// --- editor state ---

test('create_editor_state_starts_inactive_with_facing_right', () => {
  const s = createEditorState({ x: 0, y: 0 });
  assert.equal(s.active, false);
  assert.equal(s.facing, 1);
  assert.deepEqual(s.cursor, { x: 0, y: 0 });
});

test('create_editor_state_snaps_cursor_to_grid', () => {
  const s = createEditorState({ x: 23, y: 45 });
  assert.equal(s.cursor.x % GRID, 0);
  assert.equal(s.cursor.y % GRID, 0);
});

test('set_editor_active_toggles_flag', () => {
  const s = createEditorState();
  assert.equal(setEditorActive(s, true).active, true);
  assert.equal(setEditorActive(s, false).active, false);
});

test('move_cursor_steps_one_grid_cell_per_call', () => {
  const s = createEditorState({ x: 0, y: 0 });
  const right = moveCursor(s, 1, 0);
  assert.equal(right.cursor.x, GRID);
  assert.equal(right.cursor.y, 0);
  const down = moveCursor(right, 0, 1);
  assert.equal(down.cursor.x, GRID);
  assert.equal(down.cursor.y, GRID);
});

test('move_cursor_updates_facing_with_horizontal_input', () => {
  const s = createEditorState({ x: 0, y: 0 });
  assert.equal(moveCursor(s, 1, 0).facing, 1);
  assert.equal(moveCursor(s, -1, 0).facing, -1);
});

test('move_cursor_does_not_change_facing_on_vertical_only_input', () => {
  const s = { ...createEditorState({ x: 0, y: 0 }), facing: -1 };
  assert.equal(moveCursor(s, 0, 1).facing, -1);
  assert.equal(moveCursor(s, 0, -1).facing, -1);
});

test('create_editor_state_starts_in_anchor_mode_with_anchor_at_cursor', () => {
  const s = createEditorState({ x: 100, y: 200 });
  assert.equal(s.mode, 'anchor');
  assert.deepEqual(s.anchor, s.cursor);
});

test('move_cursor_in_anchor_mode_drags_anchor_with_cursor', () => {
  const s = createEditorState({ x: 0, y: 0 });
  const moved = moveCursor(moveCursor(s, 3, 2), 1, 0);
  assert.deepEqual(moved.anchor, moved.cursor);
});

test('move_cursor_in_tile_mode_leaves_anchor_fixed', () => {
  let s = createEditorState({ x: 0, y: 0 });
  s = moveCursor(s, 2, 1);          // anchor follows
  const anchorBefore = { ...s.anchor };
  s = toggleMode(s);                // → tile mode
  s = moveCursor(s, 5, 5);          // anchor must NOT move
  assert.deepEqual(s.anchor, anchorBefore);
  assert.notDeepEqual(s.cursor, anchorBefore);
});

test('toggle_mode_flips_between_anchor_and_tile', () => {
  const s0 = createEditorState();
  const s1 = toggleMode(s0);
  const s2 = toggleMode(s1);
  assert.equal(s1.mode, 'tile');
  assert.equal(s2.mode, 'anchor');
});

test('toggle_mode_into_anchor_snaps_anchor_to_current_cursor', () => {
  let s = createEditorState({ x: 0, y: 0 });
  s = toggleMode(s);                  // → tile mode
  s = moveCursor(s, 4, 0);            // cursor moves; anchor frozen at (0,0)
  s = toggleMode(s);                  // → anchor mode
  assert.deepEqual(s.anchor, s.cursor, 'anchor jumps to cursor on entry');
});

test('move_cursor_in_tile_mode_keeps_facing_fixed', () => {
  // Regression: in tile mode the reach arc must not flip with arrow input.
  // The arc's facing belongs to the anchor and should stay frozen until we
  // return to anchor mode.
  let s = createEditorState({ x: 0, y: 0 });
  s = moveCursor(s, 1, 0);            // anchor mode → facing becomes 1
  assert.equal(s.facing, 1);
  s = toggleMode(s);                  // → tile mode
  s = moveCursor(s, -1, 0);           // pressing left in tile mode
  assert.equal(s.facing, 1, 'facing must not flip in tile mode');
});

test('move_cursor_in_anchor_mode_updates_facing', () => {
  let s = createEditorState({ x: 0, y: 0 });
  s = moveCursor(s, -1, 0);
  assert.equal(s.facing, -1);
  s = moveCursor(s, 1, 0);
  assert.equal(s.facing, 1);
});

test('move_cursor_with_step_one_moves_one_pixel', () => {
  let s = createEditorState({ x: 0, y: 0 });
  s = moveCursor(s, 1, 0, 1);
  assert.equal(s.cursor.x, 1);
});

test('toggle_mode_into_tile_snaps_cursor_to_grid', () => {
  // After fine 1px movement in anchor mode, cursor may be off-grid.
  // Entering tile mode should snap so brush placement starts on a grid cell.
  let s = createEditorState({ x: 0, y: 0 });
  s = moveCursor(s, 5, 7, 1);          // cursor=(5,7), still anchor mode
  assert.deepEqual(s.cursor, { x: 5, y: 7 });
  s = toggleMode(s);                   // → tile mode
  assert.equal(s.cursor.x % GRID, 0, 'cursor x snapped');
  assert.equal(s.cursor.y % GRID, 0, 'cursor y snapped');
});


// --- stage edits ---

const sampleStage = () => ({
  id: 99,
  name: 'sample',
  spawn: { x: 60, y: 60 },
  solids: [{ x: 100, y: 100, w: 16, h: 16 }],
  goal: { x: 200, y: 200, w: 40, h: 40 },
});

test('toggle_tile_adds_when_absent', () => {
  const stage = sampleStage();
  const result = toggleTile(stage, { x: 300, y: 300 });
  assert.equal(result.solids.length, stage.solids.length + 1);
  const added = result.solids[result.solids.length - 1];
  assert.deepEqual(added, { x: 300, y: 300, w: TILE, h: TILE });
});

test('toggle_tile_removes_when_cursor_overlaps_existing_solid', () => {
  const stage = sampleStage();
  // Cursor at (100,100), existing solid (100,100,16,16) — cursor center
  // (108,108) inside solid → removes it.
  const result = toggleTile(stage, { x: 100, y: 100 });
  assert.equal(result.solids.length, stage.solids.length - 1);
  assert.ok(!result.solids.some(s => s.x === 100 && s.y === 100));
});

test('toggle_tile_erases_oversize_platform_when_cursor_overlaps_it', () => {
  // Eraser must work on platforms of any size, not just 16x16 tiles.
  const stage = {
    ...sampleStage(),
    solids: [{ x: 50, y: 200, w: 100, h: 16 }], // 100x16 platform
  };
  const result = toggleTile(stage, { x: 80, y: 200 });
  assert.equal(result.solids.length, 0);
});

test('toggle_tile_returns_new_stage_object_immutably', () => {
  const stage = sampleStage();
  const result = toggleTile(stage, { x: 300, y: 300 });
  assert.notEqual(result, stage);
  assert.notEqual(result.solids, stage.solids);
  assert.equal(stage.solids.length, 1, 'original stage unchanged');
});

test('set_spawn_updates_position', () => {
  const stage = sampleStage();
  const result = setSpawn(stage, { x: 240, y: 320 });
  assert.deepEqual(result.spawn, { x: 240, y: 320 });
});

test('set_goal_creates_box_with_default_size', () => {
  const stage = sampleStage();
  const result = setGoal(stage, { x: 400, y: 400 });
  assert.deepEqual(result.goal, { x: 400, y: 400, w: GOAL_SIZE, h: GOAL_SIZE });
});

test('serialize_stage_includes_required_fields', () => {
  const stage = sampleStage();
  const json = JSON.parse(serializeStage(stage));
  assert.equal(json.id, 99);
  assert.equal(json.name, 'sample');
  assert.deepEqual(json.spawn, stage.spawn);
  assert.equal(json.solids.length, 1);
  assert.deepEqual(json.goal, stage.goal);
});

test('serialize_stage_drops_legacy_route_field', () => {
  const stage = { ...sampleStage(), route: [{ label: 'old' }] };
  const json = JSON.parse(serializeStage(stage));
  assert.equal(json.route, undefined);
});

test('serialize_stage_handles_null_goal', () => {
  const stage = { ...sampleStage(), goal: null };
  const json = JSON.parse(serializeStage(stage));
  assert.equal(json.goal, null);
});


// --- createBlankStage ---

test('blank_stage_has_arena_outline_and_no_goal', () => {
  const s = createBlankStage();
  assert.equal(s.solids.length, 4, 'four arena boundaries: floor + 2 walls + ceiling');
  assert.equal(s.goal, null);
  assert.ok(s.spawn && typeof s.spawn.x === 'number' && typeof s.spawn.y === 'number');
});

test('blank_stage_floor_spans_full_screen_width_grid_aligned', () => {
  const s = createBlankStage({ screenW: 960, screenH: 640 });
  const floor = s.solids.find(x => x.w === 960 && x.h === 32);
  assert.ok(floor, 'floor 960×32 present (grid-aligned)');
  assert.equal(floor.y, 608, 'floor sits at SCREEN_H − floorH');
});

test('blank_stage_spawn_lands_player_on_floor', () => {
  // Player feet (spawn.y + playerH) should equal floor top.
  const screenH = 640, playerH = 24, floorH = 32;
  const s = createBlankStage({ screenH, playerH, floorH });
  assert.equal(s.spawn.y + playerH, screenH - floorH);
});

test('blank_stage_uses_provided_name_and_id', () => {
  const s = createBlankStage({ name: 'My Stage', id: 7 });
  assert.equal(s.name, 'My Stage');
  assert.equal(s.id, 7);
});
