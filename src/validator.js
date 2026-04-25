// Pure stage-clearability validation.
// Combined parabolic reachability check: simulates the player's trajectory
// frame-by-frame and verifies whether each route step is achievable under the
// current physics config. Vertical and horizontal capability are checked together,
// not independently — a jump that reaches the target height may not have enough
// horizontal travel left to land on the target platform.

import { PLAYER_W, PLAYER_H } from './level.js';

// Max height the player can reach above their feet via a normal jump.
export function computeMaxJumpHeight(cfg) {
  let vy = cfg.jumpVelocity;
  let y = 0, peak = 0, frames = 0;
  while (vy < 0 && frames < 10000) {
    vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
    y += vy;
    if (y < peak) peak = y;
    frames++;
  }
  return -peak;
}

// Total frames from jump takeoff until the player returns to start height.
function computeAirtime(cfg) {
  let vy = cfg.jumpVelocity;
  let y = 0, frames = 0;
  while (vy < 0 && frames < 10000) {
    vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
    y += vy;
    frames++;
  }
  while (y < 0 && frames < 10000) {
    vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
    y += vy;
    frames++;
  }
  return frames;
}

export function computeMaxHorizontalReach(cfg) {
  return computeAirtime(cfg) * cfg.moveSpeed;
}

function advance(state, cfg) {
  state.vy = Math.min(state.vy + cfg.gravity, cfg.maxFallSpeed);
  state.x += state.vx;
  state.y += state.vy;
}

// Player jumps from `takeoff` and must make any contact with `targetPlatform`'s
// bbox during the trajectory. Counts both top-landing and side wall-cling as
// reachable, since wall-cling + wall-jump can convert side contact into a top
// landing in actual gameplay.
//   takeoff: { x, y, vxDir } — leading edge x (right if vxDir=+1, left if -1,
//                              center if 0), feet y, horizontal direction.
//   targetPlatform: { x, y, w, h }
function canReachTarget(cfg, step) {
  const { takeoff, targetPlatform: tp } = step;
  const vxDir = takeoff.vxDir ?? 0;
  let x = takeoff.x, y = takeoff.y;
  let vx = vxDir * cfg.moveSpeed;
  let vy = cfg.jumpVelocity;

  const tLeft = tp.x, tRight = tp.x + tp.w;
  const tTop = tp.y, tBottom = tp.y + tp.h;

  let peakFeet = y;             // smallest y reached (highest position in screen)
  let extremeXReach = takeoff.x; // furthest x reached toward target

  for (let f = 0; f < 1000; f++) {
    vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
    x += vx;
    y += vy;
    if (y < peakFeet) peakFeet = y;
    if (vxDir > 0 ? x > extremeXReach : x < extremeXReach) extremeXReach = x;

    // Player bbox derived from leading edge x and feet y.
    const pLeft  = vxDir > 0 ? x - PLAYER_W : vxDir < 0 ? x : x - PLAYER_W / 2;
    const pRight = vxDir > 0 ? x : vxDir < 0 ? x + PLAYER_W : x + PLAYER_W / 2;
    const pTop = y - PLAYER_H;
    const pBottom = y;

    if (pRight >= tLeft && pLeft <= tRight && pBottom >= tTop && pTop <= tBottom) {
      return { ok: true };
    }
    if (y > takeoff.y + 600) break;
  }

  // Categorize failure. If the player's highest position never enters the target's
  // vertical span, vertical reach is the bottleneck. Otherwise horizontal.
  const peakBottom = peakFeet;
  if (peakBottom > tBottom) {
    // Player never rose high enough — even bbox top didn't reach target's bottom.
    const required = takeoff.y - tBottom;
    const available = takeoff.y - peakBottom + PLAYER_H; // bbox top reach above feet
    return { ok: false, type: 'too_high', required, available };
  }
  const required = vxDir >= 0 ? tLeft - takeoff.x : takeoff.x - tRight;
  const available = Math.abs(extremeXReach - takeoff.x);
  return { ok: false, type: 'too_far', required, available };
}

// Player jumps and must reach a wall at x = horizontalGap. Vertical position
// doesn't matter (wall is full-height).
function canReachWall(cfg, horizontalGap) {
  const state = { x: 0, y: 0, vx: cfg.moveSpeed, vy: cfg.jumpVelocity };
  let maxX = 0;
  for (let f = 0; f < 1000; f++) {
    advance(state, cfg);
    if (state.x > maxX) maxX = state.x;
    if (state.x >= horizontalGap) return { ok: true };
    if (state.y > 400) break;
  }
  return { ok: false, type: 'too_far', required: horizontalGap, available: maxX };
}

// Player wall-jumps from (wallX, wallTouchY) and must land on top of targetPlatform.
//   wallSide: +1 = right wall (jump goes left), -1 = left wall (jump goes right)
//   wallTouchY: feet y at wall-jump takeoff
//   targetPlatform: { x, y, w } where y is platform top
function canWallJumpLand(cfg, step) {
  const { wallX, wallTouchY, wallSide, targetPlatform } = step;
  const state = {
    x: wallX - wallSide * (PLAYER_W / 2),
    y: wallTouchY,
    vx: -wallSide * cfg.wallJumpVx,
    vy: cfg.wallJumpVy,
  };
  const platLeft  = targetPlatform.x;
  const platRight = targetPlatform.x + targetPlatform.w;
  const platTop   = targetPlatform.y;

  for (let f = 0; f < 1000; f++) {
    const prevY = state.y;
    advance(state, cfg);
    if (state.vy > 0 && prevY < platTop && state.y >= platTop) {
      if (state.x + PLAYER_W / 2 >= platLeft && state.x - PLAYER_W / 2 <= platRight) {
        return { ok: true };
      }
    }
    if (state.y > platTop + 600) break;
  }
  return { ok: false, type: 'unreachable', required: 0, available: 0 };
}

// Validate a stage. Returns { clearable, issues, capabilities }.
// Stages without a route are tutorials and trivially clearable.
export function validateStage(stage, cfg) {
  const maxJumpHeight = computeMaxJumpHeight(cfg);
  const maxHorizontalReach = computeMaxHorizontalReach(cfg);
  const capabilities = { maxJumpHeight, maxHorizontalReach };

  if (!stage.route || stage.route.length === 0) {
    return { clearable: true, issues: [], capabilities };
  }

  const issues = [];
  for (const step of stage.route) {
    const type = step.type ?? 'jump';
    let r;
    if (type === 'jump') {
      r = canReachTarget(cfg, step);
    } else if (type === 'wall-touch') {
      r = canReachWall(cfg, step.horizontalGap);
    } else if (type === 'wall-jump-land') {
      r = canWallJumpLand(cfg, step);
    } else {
      r = { ok: true };
    }
    if (!r.ok) {
      issues.push({ step, type: r.type, required: r.required, available: r.available });
    }
  }
  return { clearable: issues.length === 0, issues, capabilities };
}
