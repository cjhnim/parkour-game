// Runtime physics config. Starts from defaults; mutated by the debug panel.

export const DEFAULTS = Object.freeze({
  gravity:           0.7,
  maxFallSpeed:      16,
  wallSlideMaxFall:  3,
  moveSpeed:         5,
  moveAccel:         0.8,   // px/frame² acceleration when key held
  moveFriction:      0.75,  // vx multiplier per frame when no key (0~1)
  jumpVelocity:     -13,
  wallJumpVx:        6,
  wallJumpVy:       -11,
});

// Mutable config the game loop reads every frame.
export const config = { ...DEFAULTS };

export function resetToDefaults() {
  Object.assign(config, DEFAULTS);
}
