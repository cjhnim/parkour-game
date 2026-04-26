// Stage data and level-related pure logic.
// A stage is { id, name, spawn:{x,y}, solids:[box], goal:box }.

import { intersects } from './collision.js';
import { dropStep, longGap, wallClimb } from './patterns.js';

export const SCREEN_W = 960;
export const SCREEN_H = 640;
export const PLAYER_W = 32;
export const PLAYER_H = 24;

const wall = (x, y, w, h) => ({ x, y, w, h });

// Standard arena outline (floor + side walls + ceiling).
const arena = (...extras) => [
  wall(0, SCREEN_H - 40, SCREEN_W, 40),
  wall(0, 0, 20, SCREEN_H),
  wall(SCREEN_W - 20, 0, 20, SCREEN_H),
  wall(0, 0, SCREEN_W, 20),
  ...extras,
];


// === Stage 0: Tutorial ===
const stage0 = {
  id: 0,
  name: 'Tutorial — Move freely',
  spawn: { x: SCREEN_W / 2 - PLAYER_W / 2, y: SCREEN_H - 80 - PLAYER_H },
  solids: arena(),
  goal: null,
};


// === Stage 1: Stairs (jump only) ===
// Simple staircase. Each step within single-jump capability — no walls needed.
const S1_P1 = wall(180, 510, 120, 16);
const S1_P2 = wall(400, 420, 120, 16);
const S1_P3 = wall(620, 330, 120, 16);
const stage1 = {
  id: 1,
  name: 'Stage 1 — Stairs',
  spawn: { x: 60, y: SCREEN_H - 40 - PLAYER_H },
  route: [
    { label: 'Floor → P1', type: 'jump',
      takeoff: { x: 150, y: SCREEN_H - 40, vxDir: 1 }, targetPlatform: S1_P1 },
    { label: 'P1 → P2', type: 'jump',
      takeoff: { x: 300, y: 510, vxDir: 1 }, targetPlatform: S1_P2 },
    { label: 'P2 → P3', type: 'jump',
      takeoff: { x: 520, y: 420, vxDir: 1 }, targetPlatform: S1_P3 },
  ],
  solids: arena(S1_P1, S1_P2, S1_P3),
  goal: { x: 660, y: 290, w: 40, h: 40 },
};


// === Stage 2: Drop (descent) ===
// No bottom floor — falling off any platform = OOB respawn. Goal sits between
// the last drop platform's right edge and the right wall — only reachable by
// walking on it (mid-air trajectories from upper platforms pass below).
// Composed from 3 dropStep calls, all to the right.
const S2_TOP = wall(50, 160, 100, 16);
const s2a = dropStep(150, 160, 1);                                  // → P1 (300, 280)
const s2b = dropStep(s2a.platforms[0].x + 100, s2a.platforms[0].y, 1); // → P2 (550, 400)
const s2c = dropStep(s2b.platforms[0].x + 100, s2b.platforms[0].y, 1); // → P3 (800, 520)
const stage2 = {
  id: 2,
  name: 'Stage 2 — Drop',
  spawn: { x: 60, y: 160 - PLAYER_H },
  route: [...s2a.route, ...s2b.route, ...s2c.route],
  solids: [
    wall(0, 0, 20, SCREEN_H),
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),
    wall(0, 0, SCREEN_W, 20),
    S2_TOP,
    ...s2a.platforms, ...s2b.platforms, ...s2c.platforms,
  ],
  goal: { x: 890, y: 480, w: 40, h: 40 },
};


// === Stage 3: Long Gap (moving jump required) ===
const s3 = longGap(0, 0);
const stage3 = {
  id: 3,
  name: 'Stage 3 — Long Gap',
  spawn: { x: 60, y: SCREEN_H - 40 - PLAYER_H },
  route: s3.route,
  solids: [
    ...s3.platforms,
    wall(0, 0, 20, SCREEN_H),
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),
    wall(0, 0, SCREEN_W, 20),
  ],
  goal: { x: 800, y: SCREEN_H - 80, w: 40, h: 40 },
};


// === Stage 4: Climb (wall-jump required) ===
// P4 → Goal forces side wall-cling: peak height ≈ 114 < 130 vGap to Goal.
// P5 is a trap — climbable but Goal unreachable from there.
const s4 = wallClimb(0, 0);
const stage4 = {
  id: 4,
  name: 'Stage 4 — Climb',
  spawn: { x: 60, y: SCREEN_H - 80 - PLAYER_H },
  route: s4.route,
  solids: arena(...s4.platforms),
  goal: { x: 700, y: SCREEN_H - 570, w: 40, h: 40 },
};


// === Stage 5: Zigzag Drop (alternating directions, asymmetric dx) ===
// True zigzag (left/right alternating, unlike Stage 2's one-way descent).
// Asymmetric dx (210 right, 100 left) makes the pattern drift slightly right
// each cycle so no two same-direction platforms share a column — preventing
// the "skip every other platform via straight drop" exploit. No bottom floor:
// missing any platform = OOB respawn, forcing the player to land each step
// precisely. Goal sits on the final platform.
const S5_TOP = wall(50, 160, 100, 16);
const s5a = dropStep(150, 160,  1, { dx: 210, dy: 100 }); // → P1 (360, 260)
const s5b = dropStep(360, 260, -1, { dx: 100, dy: 100 }); // → P2 (160, 360)
const s5c = dropStep(260, 360,  1, { dx: 210, dy: 100 }); // → P3 (470, 460)
const s5d = dropStep(470, 460, -1, { dx: 100, dy: 100 }); // → P4 (270, 560)
const stage5 = {
  id: 5,
  name: 'Stage 5 — Zigzag Drop',
  spawn: { x: 60, y: 160 - PLAYER_H },
  route: [...s5a.route, ...s5b.route, ...s5c.route, ...s5d.route],
  solids: [
    wall(0, 0, 20, SCREEN_H),
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),
    wall(0, 0, SCREEN_W, 20),
    S5_TOP,
    ...s5a.platforms, ...s5b.platforms, ...s5c.platforms, ...s5d.platforms,
  ],
  goal: { x: 290, y: 520, w: 40, h: 40 },
};


export const STAGES = [stage0, stage1, stage2, stage3, stage4, stage5];

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
