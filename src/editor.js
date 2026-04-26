// Stage editor state + pure helpers.
// All functions in this file are pure (no DOM/Canvas/clipboard/RAF).
// Side-effectful glue (input wiring, rendering, persistence) lives elsewhere.

const GRID = 16;

// Compute the two reach arcs from a takeoff point.
//   cursor: { x, y }    takeoff position (player feet y, leading edge x)
//   facing: +1 (right) | -1 (left)
//   cfg:    physics config (gravity, jumpVelocity, moveSpeed, maxFallSpeed)
// Returns { outer, inner } — arrays of {x,y}.
//   outer = trajectory at vx = facing * moveSpeed (max horizontal travel)
//   inner = trajectory at vx = 0 (pure vertical from a standing jump)
// The region between the two curves is the set of points the player can
// reach by choosing any vx ∈ [0, facing * moveSpeed] for this jump.
export function computeReachArcs(cursor, facing, cfg) {
  const dir = facing >= 0 ? 1 : -1;
  return {
    outer: simulateArc(cursor.x, cursor.y, dir * cfg.moveSpeed, cfg),
    inner: simulateArc(cursor.x, cursor.y, 0, cfg),
  };
}

function simulateArc(x0, y0, vx, cfg) {
  const pts = [{ x: x0, y: y0 }];
  let x = x0, y = y0, vy = cfg.jumpVelocity;
  for (let f = 0; f < 300; f++) {
    vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
    x += vx;
    y += vy;
    pts.push({ x, y });
    if (y > y0 + 800) break;
  }
  return pts;
}

// Snap a coordinate to the editor grid.
export function snapToGrid(value, grid = GRID) {
  const snapped = Math.round(value / grid) * grid;
  return snapped === 0 ? 0 : snapped; // normalize -0 → 0
}

export { GRID };
