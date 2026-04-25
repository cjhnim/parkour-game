import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, getStage, makePlayer, hasReachedGoal, isOutOfBounds, SCREEN_H, PLAYER_W, PLAYER_H } from '../src/level.js';

test('stages_list_contains_tutorial_and_stage_one', () => {
  assert.ok(STAGES.length >= 2);
  assert.equal(STAGES[0].id, 0);
  assert.equal(STAGES[1].id, 1);
});

test('tutorial_stage_has_no_goal', () => {
  const s = getStage(0);
  assert.equal(s.goal, null);
});

test('tutorial_stage_spawn_is_inside_play_area', () => {
  const s = getStage(0);
  assert.ok(s.spawn.x > 0 && s.spawn.x < 960);
  assert.ok(s.spawn.y > 0 && s.spawn.y < 640);
});

test('stage_one_has_goal_above_spawn', () => {
  const s = getStage(1);
  assert.ok(s.goal !== null);
  assert.ok(s.goal.y < s.spawn.y, 'goal should be higher (smaller y) than spawn');
});

test('get_stage_returns_first_stage_for_unknown_id', () => {
  const s = getStage(999);
  assert.equal(s.id, 0);
});

test('goal_reached_when_player_overlaps_goal_zone', () => {
  const stage = getStage(1);
  const player = { x: stage.goal.x + 5, y: stage.goal.y + 5, w: 24, h: 32 };
  assert.equal(hasReachedGoal(player, stage), true);
});

test('goal_not_reached_when_player_far_from_goal', () => {
  const stage = getStage(1);
  const player = { x: 0, y: 600, w: 24, h: 32 };
  assert.equal(hasReachedGoal(player, stage), false);
});

test('goal_never_reached_in_tutorial_stage', () => {
  const stage = getStage(0);
  const player = { x: 100, y: 100, w: 24, h: 32 };
  assert.equal(hasReachedGoal(player, stage), false);
});

test('player_below_screen_returns_out_of_bounds', () => {
  assert.equal(isOutOfBounds({ x: 0, y: SCREEN_H + 10, w: 24, h: 32 }), true);
});

test('player_within_screen_is_in_bounds', () => {
  assert.equal(isOutOfBounds({ x: 0, y: 100, w: 24, h: 32 }), false);
});

// --- makePlayer ---
// 이 테스트는 reset() 등에서 선언되지 않은 변수를 참조하는 실수를 방지한다.
// 초기 플레이어 상태의 모든 필드가 정확한 값으로 채워지는지 검증한다.

test('makePlayer_places_player_at_stage_spawn', () => {
  const stage = getStage(1);
  const player = makePlayer(stage);
  assert.equal(player.x, stage.spawn.x);
  assert.equal(player.y, stage.spawn.y);
});

test('makePlayer_uses_standard_player_dimensions', () => {
  const player = makePlayer(getStage(0));
  assert.equal(player.w, PLAYER_W);
  assert.equal(player.h, PLAYER_H);
});

test('makePlayer_returns_only_expected_fields', () => {
  const player = makePlayer(getStage(0));
  assert.deepEqual(Object.keys(player).sort(), ['h', 'w', 'x', 'y']);
});
