// Pattern functions — translation-invariant building blocks extracted from
// existing stages. Each pattern returns { platforms, route, bbox } with all
// coordinates offset by (ox, oy). Once a pattern's route is validator-clear
// at one offset, it is clear at any offset (jump physics depend on relative
// distances, not absolute coordinates).
//
// Convention: (ox, oy) should be 16px multiples. Not enforced.

import { SCREEN_H } from './level.js';

const w = (x, y, ww, hh) => ({ x, y, w: ww, h: hh });

// Drop stairs (Stage 2 source). Top platform + 3 descending platforms to the right.
export function dropStairs(ox = 0, oy = 0) {
  const top = w(ox + 50,  oy + 160, 100, 16);
  const p1  = w(ox + 300, oy + 280, 100, 16);
  const p2  = w(ox + 550, oy + 400, 100, 16);
  const p3  = w(ox + 800, oy + 520, 100, 16);
  return {
    platforms: [top, p1, p2, p3],
    route: [
      { label: 'Top → P1', type: 'jump',
        takeoff: { x: ox + 150, y: oy + 160, vxDir: 1 }, targetPlatform: p1 },
      { label: 'P1 → P2', type: 'jump',
        takeoff: { x: ox + 400, y: oy + 280, vxDir: 1 }, targetPlatform: p2 },
      { label: 'P2 → P3', type: 'jump',
        takeoff: { x: ox + 650, y: oy + 400, vxDir: 1 }, targetPlatform: p3 },
    ],
    bbox: { x: ox + 50, y: oy + 160, w: 850, h: 376 },
  };
}

// Long gap (Stage 3 source). Two floor segments at SCREEN_H-40 with ~190px pit.
export function longGap(ox = 0, oy = 0) {
  const floorY = oy + SCREEN_H - 40;
  const left  = w(ox + 0,   floorY, 400, 40);
  const right = w(ox + 590, floorY, 370, 40);
  return {
    platforms: [left, right],
    route: [
      { label: 'Run-up over pit', type: 'jump',
        takeoff: { x: ox + 400, y: floorY, vxDir: 1 }, targetPlatform: right },
    ],
    bbox: { x: ox, y: floorY, w: 960, h: 40 },
  };
}

// Wall climb (Stage 4 source). 5 zigzag climbing platforms + 1 trap + goal
// platform. Last jump uses wall-cling on goal platform's left face.
// Assumes a floor exists at y = oy + SCREEN_H - 40 (caller provides arena).
export function wallClimb(ox = 0, oy = 0) {
  const floorY = oy + SCREEN_H - 40;
  const p1       = w(ox + 150, oy + SCREEN_H - 130, 140, 16);
  const p2       = w(ox + 380, oy + SCREEN_H - 220, 140, 16);
  const p3       = w(ox + 180, oy + SCREEN_H - 310, 140, 16);
  const p4       = w(ox + 450, oy + SCREEN_H - 400, 140, 16);
  const p5Trap   = w(ox + 220, oy + SCREEN_H - 490, 140, 16);
  const goalPlat = w(ox + 560, oy + SCREEN_H - 530, 200, 16);
  return {
    platforms: [p1, p2, p3, p4, p5Trap, goalPlat],
    route: [
      { label: 'Floor → P1', type: 'jump',
        takeoff: { x: ox + 100, y: floorY, vxDir: 1 }, targetPlatform: p1 },
      { label: 'P1 → P2', type: 'jump',
        takeoff: { x: ox + 290, y: oy + SCREEN_H - 130, vxDir: 1 }, targetPlatform: p2 },
      { label: 'P2 → P3', type: 'jump',
        takeoff: { x: ox + 380, y: oy + SCREEN_H - 220, vxDir: -1 }, targetPlatform: p3 },
      { label: 'P3 → P4', type: 'jump',
        takeoff: { x: ox + 320, y: oy + SCREEN_H - 310, vxDir: 1 }, targetPlatform: p4 },
      { label: 'P4 → Goal', type: 'jump',
        takeoff: { x: ox + 482, y: oy + SCREEN_H - 400, vxDir: 1 }, targetPlatform: goalPlat },
    ],
    bbox: { x: ox + 100, y: oy + 110, w: 700, h: 530 },
  };
}

export const PATTERN_REGISTRY = { dropStairs, longGap, wallClimb };
