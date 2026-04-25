// Pure physics functions. No DOM, no globals, no time.
// All inputs and outputs are plain values; one frame = one call.

export const GRAVITY = 0.6;          // px / frame^2
export const MAX_FALL_SPEED = 14;    // px / frame
export const WALL_SLIDE_MAX_FALL = 3; // px / frame, slower fall when wall sliding
export const MOVE_SPEED = 4;          // px / frame, horizontal
export const JUMP_VELOCITY = -12;     // px / frame, upward
export const WALL_JUMP_VX = 6;        // px / frame, horizontal kick
export const WALL_JUMP_VY = -11;      // px / frame, upward kick

// Apply gravity for one step. Caps at MAX_FALL_SPEED.
// `slidingOnWall` true reduces the fall cap to simulate friction.
export function applyGravity(vy, slidingOnWall = false) {
  const next = vy + GRAVITY;
  const cap = slidingOnWall ? WALL_SLIDE_MAX_FALL : MAX_FALL_SPEED;
  return next > cap ? cap : next;
}

// Compute horizontal velocity from input.
// `input` is { left: bool, right: bool }.
export function computeVx(input) {
  let vx = 0;
  if (input.left) vx -= MOVE_SPEED;
  if (input.right) vx += MOVE_SPEED;
  return vx;
}

// Trigger a jump. Only takes effect when grounded.
export function tryJump(vy, grounded) {
  return grounded ? JUMP_VELOCITY : vy;
}

// Trigger a wall jump. `wallSide` is -1 (wall on left) or +1 (wall on right) or 0 (no wall).
// Returns { vx, vy } after the kick. If no wall, returns current values unchanged.
export function tryWallJump(vx, vy, wallSide) {
  if (wallSide === 0) return { vx, vy };
  // Kick away from the wall: wall on left (-1) → push right (+); wall on right (+1) → push left (-).
  return { vx: -wallSide * WALL_JUMP_VX, vy: WALL_JUMP_VY };
}

// Integrate position one step.
export function step(pos, vel) {
  return { x: pos.x + vel.vx, y: pos.y + vel.vy };
}
