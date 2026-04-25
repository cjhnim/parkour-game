// Pure stage-clearability validation functions.
// Simulates player capability from current physics config and checks each route step.

// Simulate one frame matching the game loop order: hold → gravity → integrate.
function simFrame(vy, heldFrames, cfg) {
  if (heldFrames < cfg.jumpHoldMaxFrames && vy < 0) vy -= cfg.jumpHoldForce;
  vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
  return vy;
}

// Max height the player can reach above their feet in a full-hold jump.
export function computeMaxJumpHeight(cfg) {
  let vy = cfg.jumpVelocity; // negative = upward
  let y = 0;
  let peak = 0;
  let heldFrames = 0;

  while (vy < 0 && heldFrames < 10000) {
    vy = simFrame(vy, heldFrames, cfg);
    y += vy;
    if (y < peak) peak = y;
    heldFrames++;
  }
  return -peak; // positive: pixels above start
}

// Total frames from jump takeoff until the player returns to the same height.
function computeAirtime(cfg) {
  let vy = cfg.jumpVelocity;
  let y = 0;
  let heldFrames = 0;
  let frames = 0;

  // Rising phase
  while (vy < 0 && frames < 10000) {
    vy = simFrame(vy, heldFrames, cfg);
    y += vy;
    heldFrames++;
    frames++;
  }

  // Falling phase: until back to y >= 0
  while (y < 0 && frames < 10000) {
    vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
    y += vy;
    frames++;
  }

  return frames;
}

// Max horizontal distance covered while in the air (moving at full speed throughout).
export function computeMaxHorizontalReach(cfg) {
  return computeAirtime(cfg) * cfg.moveSpeed;
}

// Check whether the given stage can be cleared with the provided physics config.
// Returns { clearable: bool, issues: Array, capabilities: { maxJumpHeight, maxHorizontalReach } }.
// Stages without a route (tutorial) are always considered clearable.
export function validateStage(stage, cfg) {
  const maxJumpHeight = computeMaxJumpHeight(cfg);
  const maxHorizontalReach = computeMaxHorizontalReach(cfg);
  const capabilities = { maxJumpHeight, maxHorizontalReach };

  if (!stage.route || stage.route.length === 0) {
    return { clearable: true, issues: [], capabilities };
  }

  const issues = [];

  for (const step of stage.route) {
    if (step.verticalGap > maxJumpHeight) {
      issues.push({ step, type: 'too_high', required: step.verticalGap, available: maxJumpHeight });
    }
    if (step.horizontalGap > maxHorizontalReach) {
      issues.push({ step, type: 'too_far', required: step.horizontalGap, available: maxHorizontalReach });
    }
  }

  return { clearable: issues.length === 0, issues, capabilities };
}
