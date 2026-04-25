// Pure AABB collision functions.
// Box: { x, y, w, h } where (x, y) is top-left.

export function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Resolve player movement against a list of solid boxes.
// Inputs:
//   prev: previous position { x, y, w, h }
//   vel:  intended velocity { vx, vy }
//   solids: array of solid boxes
// Outputs:
//   { pos: {x,y}, vel: {vx,vy}, grounded, wallSide }
//     wallSide: -1 if touching wall on left, +1 if right, 0 otherwise
//
// Strategy: resolve X first, then Y. Standard platformer approach.
export function resolveMovement(prev, vel, solids) {
  let { x, y } = prev;
  const { w, h } = prev;
  let { vx, vy } = vel;
  let wallSide = 0;
  let grounded = false;

  // X axis
  x += vx;
  for (const s of solids) {
    if (intersects({ x, y, w, h }, s)) {
      if (vx > 0) {
        x = s.x - w;
        wallSide = 1;
      } else if (vx < 0) {
        x = s.x + s.w;
        wallSide = -1;
      }
      vx = 0;
    }
  }

  // Y axis
  y += vy;
  for (const s of solids) {
    if (intersects({ x, y, w, h }, s)) {
      if (vy > 0) {
        y = s.y - h;
        grounded = true;
      } else if (vy < 0) {
        y = s.y + s.h;
      }
      vy = 0;
    }
  }

  return { pos: { x, y }, vel: { vx, vy }, grounded, wallSide };
}
