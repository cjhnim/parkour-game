// Runtime physics config. Starts from defaults; mutated by the debug panel.

export const DEFAULTS = Object.freeze({
  gravity:           0.6,
  maxFallSpeed:      14,
  wallSlideMaxFall:  3,
  moveSpeed:         4,
  moveAccel:         0.8,   // px/frame² acceleration when key held
  moveFriction:      0.75,  // vx multiplier per frame when no key (0~1)
  jumpVelocity:     -12,
  jumpHoldForce:     0.8,   // extra upward force per frame while jump held
  jumpHoldMaxFrames: 12,    // max frames jump hold boost applies
  wallJumpVx:        6,
  wallJumpVy:       -11,
});

// Mutable config the game loop reads every frame.
export const config = { ...DEFAULTS };

export function resetToDefaults() {
  Object.assign(config, DEFAULTS);
}
