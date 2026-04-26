// Stage data and level-related pure logic.
// A stage is { id, name, spawn:{x,y}, solids:[box], goal:box | null }.

import { intersects } from './collision.js';

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


// === Stage 1: Stairs ===
const stage1 = {
  id: 1,
  name: 'Stage 1 — Stairs',
  spawn: { x: 60, y: SCREEN_H - 40 - PLAYER_H },
  solids: arena(
    wall(180, 510, 120, 16),
    wall(400, 420, 120, 16),
    wall(620, 330, 120, 16),
  ),
  goal: { x: 660, y: 290, w: 40, h: 40 },
};


// === Stage 2: Drop (one-way descent right) ===
// No bottom floor — falling off any platform = OOB respawn.
const stage2 = {
  id: 2,
  name: 'Stage 2 — Drop',
  spawn: { x: 60, y: 160 - PLAYER_H },
  solids: [
    wall(0, 0, 20, SCREEN_H),
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),
    wall(0, 0, SCREEN_W, 20),
    wall(50,  160, 100, 16), // TOP
    wall(300, 280, 100, 16), // P1
    wall(550, 400, 100, 16), // P2
    wall(800, 520, 100, 16), // P3
  ],
  goal: { x: 890, y: 480, w: 40, h: 40 },
};


// === Stage 3: Long Gap (running jump required) ===
const stage3 = {
  id: 3,
  name: 'Stage 3 — Long Gap',
  spawn: { x: 60, y: SCREEN_H - 40 - PLAYER_H },
  solids: [
    wall(0,   SCREEN_H - 40, 400, 40), // left floor
    wall(590, SCREEN_H - 40, 370, 40), // right floor
    wall(0, 0, 20, SCREEN_H),
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),
    wall(0, 0, SCREEN_W, 20),
  ],
  goal: { x: 800, y: SCREEN_H - 80, w: 40, h: 40 },
};


// === Stage 4: Climb (wall-jump required) ===
// P5 is a trap — climbable but goal unreachable from there.
const stage4 = {
  id: 4,
  name: 'Stage 4 — Climb',
  spawn: { x: 60, y: SCREEN_H - 80 - PLAYER_H },
  solids: arena(
    wall(150, SCREEN_H - 130, 140, 16), // P1
    wall(380, SCREEN_H - 220, 140, 16), // P2
    wall(180, SCREEN_H - 310, 140, 16), // P3
    wall(450, SCREEN_H - 400, 140, 16), // P4
    wall(220, SCREEN_H - 490, 140, 16), // P5 (trap)
    wall(560, SCREEN_H - 530, 200, 16), // goal platform
  ),
  goal: { x: 700, y: SCREEN_H - 570, w: 40, h: 40 },
};


// === Stage 5: Zigzag Drop ===
// True left/right alternating zigzag with asymmetric drift to break column
// alignment. No bottom floor — wrong drop = OOB.
const stage5 = {
  id: 5,
  name: 'Stage 5 — Zigzag Drop',
  spawn: { x: 60, y: 160 - PLAYER_H },
  solids: [
    wall(0, 0, 20, SCREEN_H),
    wall(SCREEN_W - 20, 0, 20, SCREEN_H),
    wall(0, 0, SCREEN_W, 20),
    wall(50,  160, 100, 16), // TOP
    wall(360, 260, 100, 16), // P1
    wall(160, 360, 100, 16), // P2
    wall(470, 460, 100, 16), // P3
    wall(270, 560, 100, 16), // P4
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
export function hasReachedGoal(player, stage) {
  if (!stage.goal) return false;
  return intersects(player, stage.goal);
}

// Did the player fall below the screen (or otherwise leave the play area)?
export function isOutOfBounds(player, screenH = SCREEN_H) {
  return player.y > screenH;
}
