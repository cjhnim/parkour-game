// Stage data and level-related pure logic.
// A stage is { id, name, spawn:{x,y}, solids:[box], goal:box }.

import { intersects } from './collision.js';

export const SCREEN_W = 960;
export const SCREEN_H = 640;
export const PLAYER_W = 24;
export const PLAYER_H = 32;

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
const stage1 = {
  id: 1,
  name: 'Stage 1 — Climb',
  spawn: { x: 60, y: SCREEN_H - 80 - PLAYER_H },
  solids: [
    wall(0, SCREEN_H - 40, SCREEN_W, 40),     // floor
    wall(0, 0, 20, SCREEN_H),                  // left wall
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),     // right wall
    wall(0, 0, SCREEN_W, 20),                  // ceiling
    // Climbing platforms (bottom → top, zigzag)
    wall(150, SCREEN_H - 130, 140, 16),
    wall(380, SCREEN_H - 220, 140, 16),
    wall(180, SCREEN_H - 310, 140, 16),
    wall(450, SCREEN_H - 400, 140, 16),
    wall(220, SCREEN_H - 490, 140, 16),
    wall(560, SCREEN_H - 560, 200, 16),       // goal platform
  ],
  goal: { x: 700, y: SCREEN_H - 600, w: 40, h: 40 },
};

export const STAGES = [stage0, stage1];

export function getStage(id) {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
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
