// Pure physics functions. No DOM, no globals, no time.
// All inputs and outputs are plain values; one frame = one call.
// Each function accepts an optional `cfg` last parameter (defaults to DEFAULTS)
// so the game loop can inject a runtime-mutable config while tests stay unchanged.

import { DEFAULTS } from './tuning.js';

// Re-export default values as named constants so tests can import them directly.
export const GRAVITY            = DEFAULTS.gravity;
export const MAX_FALL_SPEED     = DEFAULTS.maxFallSpeed;
export const WALL_SLIDE_MAX_FALL = DEFAULTS.wallSlideMaxFall;
export const MOVE_SPEED         = DEFAULTS.moveSpeed;
export const JUMP_VELOCITY      = DEFAULTS.jumpVelocity;
export const WALL_JUMP_VX       = DEFAULTS.wallJumpVx;
export const WALL_JUMP_VY       = DEFAULTS.wallJumpVy;

export function applyGravity(vy, slidingOnWall = false, cfg = DEFAULTS) {
  const next = vy + cfg.gravity;
  const cap = slidingOnWall ? cfg.wallSlideMaxFall : cfg.maxFallSpeed;
  return next > cap ? cap : next;
}

export function computeVx(input, cfg = DEFAULTS) {
  let vx = 0;
  if (input.left) vx -= cfg.moveSpeed;
  if (input.right) vx += cfg.moveSpeed;
  return vx;
}

export function tryJump(vy, grounded, cfg = DEFAULTS) {
  return grounded ? cfg.jumpVelocity : vy;
}

export function tryWallJump(vx, vy, wallSide, cfg = DEFAULTS) {
  if (wallSide === 0) return { vx, vy };
  return { vx: -wallSide * cfg.wallJumpVx, vy: cfg.wallJumpVy };
}

// Acceleration-based horizontal movement with friction.
// `currentVx` is the velocity from the previous frame.
export function accelerateVx(currentVx, input, cfg = DEFAULTS) {
  let vx = currentVx;

  if (input.right) vx += cfg.moveAccel;
  else if (input.left) vx -= cfg.moveAccel;
  else {
    vx *= cfg.moveFriction;
    if (Math.abs(vx) < 0.1) vx = 0;
  }

  return Math.max(-cfg.moveSpeed, Math.min(cfg.moveSpeed, vx));
}

// Variable jump: apply extra upward force while jump key is held and player is rising.
// `heldFrames` counts how many frames the key has been held since the jump started.
export function applyJumpHold(vy, jumpHeld, heldFrames, cfg = DEFAULTS) {
  if (!jumpHeld || heldFrames >= cfg.jumpHoldMaxFrames || vy >= 0) return vy;
  return vy - cfg.jumpHoldForce;
}

export function step(pos, vel) {
  return { x: pos.x + vel.vx, y: pos.y + vel.vy };
}
