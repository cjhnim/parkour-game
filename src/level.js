// Stage data and level-related pure logic.
// A stage is { id, name, spawn:{x,y}, solids:[box], goal:box | null }.
//
// All interior platform positions are aligned to a 16px grid (matches editor
// cursor step). Arena boundaries (full-width floor, side walls, ceiling)
// keep their natural sizes (40·20·20 thick) and may not align — they're
// not edited by the in-game editor.

import { intersects } from './collision.js';

export const SCREEN_W = 960;
export const SCREEN_H = 640;
export const PLAYER_W = 32;
export const PLAYER_H = 24;

const wall = (x, y, w, h) => ({ x, y, w, h });

// Arena boundaries — all 16px grid-aligned.
//   floor:   y=608, h=32  (occupies bottom two grid rows)
//   walls:   w=16  (one grid column on each side)
//   ceiling: h=16  (one grid row at the top)
export const FLOOR_H = 32;
export const WALL_W = 16;
export const CEILING_H = 16;
export const FLOOR_TOP = SCREEN_H - FLOOR_H; // 608

const sideWalls = () => [
  wall(0, 0, WALL_W, SCREEN_H),
  wall(SCREEN_W - WALL_W, 0, WALL_W, SCREEN_H),
  wall(0, 0, SCREEN_W, CEILING_H),
];

const arena = (...extras) => [
  wall(0, FLOOR_TOP, SCREEN_W, FLOOR_H),
  ...sideWalls(),
  ...extras,
];

// Same arena outline minus the floor — for stages where falling = OOB.
const arenaNoFloor = (...extras) => [...sideWalls(), ...extras];


// === Stage 0: Tutorial ===
const stage0 = {
  id: 0,
  name: 'Tutorial — Move freely',
  spawn: { x: SCREEN_W / 2 - PLAYER_W / 2, y: FLOOR_TOP - 64 - PLAYER_H },
  solids: arena(),
  goal: null,
};


// === Stage 1: Stairs ===
const stage1 = {
  id: 1,
  name: 'Stage 1 — Stairs',
  spawn: { x: 64, y: FLOOR_TOP - PLAYER_H },
  solids: arena(
    wall(176, 512, 120, 16),
    wall(400, 416, 120, 16),
    wall(624, 336, 120, 16),
  ),
  goal: { x: 656, y: 288, w: 40, h: 40 },
};


// === Stage 2: Drop (one-way descent right) ===
const stage2 = {
  id: 2,
  name: 'Stage 2 — Drop',
  spawn: { x: 64, y: 160 - PLAYER_H },
  solids: arenaNoFloor(
    wall( 48, 160, 100, 16), // TOP
    wall(304, 288, 100, 16), // P1
    wall(544, 400, 100, 16), // P2
    wall(800, 528, 100, 16), // P3
  ),
  goal: { x: 896, y: 480, w: 40, h: 40 },
};


// === Stage 3: Long Gap ===
const stage3 = {
  id: 3,
  name: 'Stage 3 — Long Gap',
  spawn: { x: 64, y: FLOOR_TOP - PLAYER_H },
  solids: [
    wall(0,   FLOOR_TOP, 400, FLOOR_H), // left floor
    wall(592, FLOOR_TOP, 368, FLOOR_H), // right floor
    wall(0, 0, WALL_W, SCREEN_H),
    wall(SCREEN_W - WALL_W, 0, WALL_W, SCREEN_H),
    wall(0, 0, SCREEN_W, CEILING_H),
  ],
  goal: { x: 800, y: FLOOR_TOP - 48, w: 40, h: 40 },
};


// === Stage 4: Long Gap (custom — saved via editor 2026-04-26) ===
// Right-side landing zone redrawn with 16x16 tiles; sits 24px above the
// original floor. Inserted between Stage 3 and the old Climb/Zigzag.
const stage4_new = {
  id: 4,
  name: 'Stage 4 — Long Gap (custom)',
  spawn: { x: 64, y: 576 },
  solids: arenaNoFloor(
    wall(0, FLOOR_TOP, 400, FLOOR_H), // partial left floor
    wall(592, 592, 16, 16), wall(592, 576, 16, 16),
    wall(608, 576, 16, 16), wall(608, 592, 16, 16),
    wall(624, 592, 16, 16), wall(624, 576, 16, 16),
    wall(640, 576, 16, 16), wall(640, 592, 16, 16),
    wall(656, 592, 16, 16), wall(656, 576, 16, 16),
    wall(672, 576, 16, 16), wall(672, 592, 16, 16),
    wall(688, 592, 16, 16), wall(688, 576, 16, 16),
    wall(704, 576, 16, 16), wall(704, 592, 16, 16),
    wall(720, 592, 16, 16), wall(720, 576, 16, 16),
    wall(736, 576, 16, 16), wall(736, 592, 16, 16),
    wall(752, 592, 16, 16), wall(752, 576, 16, 16),
    wall(768, 576, 16, 16), wall(768, 592, 16, 16),
    wall(784, 592, 16, 16), wall(784, 576, 16, 16),
  ),
  goal: { x: 736, y: 544, w: 40, h: 40 },
};


// === Stage 5: Climb (wall-jump required) ===
const stage5_climb = {
  id: 5,
  name: 'Stage 5 — Climb',
  spawn: { x: 64, y: FLOOR_TOP - 80 - PLAYER_H },
  solids: arena(
    wall(144, 512, 140, 16), // P1
    wall(384, 416, 140, 16), // P2
    wall(176, 336, 140, 16), // P3
    wall(448, 240, 140, 16), // P4
    wall(224, 144, 140, 16), // P5 (trap)
    wall(560, 112, 200, 16), // goal platform
  ),
  goal: { x: 704, y: 64, w: 40, h: 40 },
};


// === Stage 6: Zigzag Drop (alternating directions, asymmetric drift) ===
const stage6_zigzag = {
  id: 6,
  name: 'Stage 6 — Zigzag Drop',
  spawn: { x: 64, y: 160 - PLAYER_H },
  solids: arenaNoFloor(
    wall( 48, 160, 100, 16), // TOP
    wall(352, 256, 100, 16), // P1
    wall(160, 368, 100, 16), // P2
    wall(464, 464, 100, 16), // P3
    wall(272, 560, 100, 16), // P4
  ),
  goal: { x: 288, y: 528, w: 40, h: 40 },
};


export const STAGES = [stage0, stage1, stage2, stage3, stage4_new, stage5_climb, stage6_zigzag];

export function getStage(id) {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

export function makePlayer(stage) {
  return { x: stage.spawn.x, y: stage.spawn.y, w: PLAYER_W, h: PLAYER_H };
}

export function hasReachedGoal(player, stage) {
  if (!stage.goal) return false;
  return intersects(player, stage.goal);
}

export function isOutOfBounds(player, screenH = SCREEN_H) {
  return player.y > screenH;
}
