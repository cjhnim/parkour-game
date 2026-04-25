// Stage data and level-related pure logic.
// A stage is { id, name, spawn:{x,y}, solids:[box], goal:box }.

import { intersects } from './collision.js';

export const SCREEN_W = 960;
export const SCREEN_H = 640;
export const PLAYER_W = 32;
export const PLAYER_H = 24;

const wall = (x, y, w, h) => ({ x, y, w, h });

// Stage 0: Tutorial. Empty room with floor and side walls only.
const stage0 = {
  id: 0,
  name: 'Tutorial — Move freely',
  spawn: { x: SCREEN_W / 2 - PLAYER_W / 2, y: SCREEN_H - 80 - PLAYER_H },
  solids: [
    wall(0, SCREEN_H - 40, SCREEN_W, 40),     // floor
    wall(0, 0, 20, SCREEN_H),                  // left wall
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),     // right wall
    wall(0, 0, SCREEN_W, 20),                  // ceiling
  ],
  // No goal in tutorial — player explores freely. Use null to indicate no clear condition.
  goal: null,
};

// Stage 1: Climbing course. Start bottom-left, reach top-right.
// Platform constants reused by both solids and route's targetPlatform.
const P1       = wall(150, SCREEN_H - 130, 140, 16);
const P2       = wall(380, SCREEN_H - 220, 140, 16);
const P3       = wall(180, SCREEN_H - 310, 140, 16);
const P4       = wall(450, SCREEN_H - 400, 140, 16);
const P5_TRAP  = wall(220, SCREEN_H - 490, 140, 16);
const GOAL_PLAT = wall(560, SCREEN_H - 530, 200, 16);

const stage1 = {
  id: 1,
  name: 'Stage 1 — Climb',
  spawn: { x: 60, y: SCREEN_H - 80 - PLAYER_H },
  // Route: ordered steps the player must complete to clear the stage.
  // Each step's takeoff point and target platform are explicit. Validator checks
  // whether the player's bbox can overlap the target's bbox during the trajectory —
  // this counts both top landing AND side wall-cling as success, matching what's
  // actually achievable in-game with wall-jump mechanics.
  // P5는 함정: 올라갈 수 있지만 Goal에 도달 불가.
  route: [
    { label: 'Floor → P1', type: 'jump',
      takeoff: { x: 100, y: SCREEN_H - 40, vxDir: 1 }, targetPlatform: P1 },
    { label: 'P1 → P2', type: 'jump',
      takeoff: { x: 290, y: SCREEN_H - 130, vxDir: 1 }, targetPlatform: P2 },
    { label: 'P2 → P3', type: 'jump',
      takeoff: { x: 380, y: SCREEN_H - 220, vxDir: -1 }, targetPlatform: P3 },
    { label: 'P3 → P4', type: 'jump',
      takeoff: { x: 320, y: SCREEN_H - 310, vxDir: 1 }, targetPlatform: P4 },
    { label: 'P4 → Goal', type: 'jump',
      takeoff: { x: 482, y: SCREEN_H - 400, vxDir: 1 }, targetPlatform: GOAL_PLAT },
  ],
  solids: [
    wall(0, SCREEN_H - 40, SCREEN_W, 40),     // floor
    wall(0, 0, 20, SCREEN_H),                  // left wall
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),     // right wall
    wall(0, 0, SCREEN_W, 20),                  // ceiling
    P1, P2, P3, P4, P5_TRAP, GOAL_PLAT,
  ],
  goal: { x: 700, y: SCREEN_H - 570, w: 40, h: 40 },
};

export const STAGES = [stage0, stage1];

export function getStage(id) {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

// Returns the initial player rect for a stage's spawn point.
export function makePlayer(stage) {
  return { x: stage.spawn.x, y: stage.spawn.y, w: PLAYER_W, h: PLAYER_H };
}

// Did the player overlap the stage's goal zone?
// Player: { x, y, w, h }. Returns false when the stage has no goal.
export function hasReachedGoal(player, stage) {
  if (!stage.goal) return false;
  return intersects(player, stage.goal);
}

// Did the player fall below the screen (or otherwise leave the play area)?
export function isOutOfBounds(player, screenH = SCREEN_H) {
  return player.y > screenH;
}
