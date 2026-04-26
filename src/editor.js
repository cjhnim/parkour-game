// Stage editor state + pure helpers.
// All functions in this file are pure (no DOM/Canvas/clipboard/RAF).
// Side-effectful glue (input wiring, rendering, persistence) lives elsewhere.

const GRID = 16;
const TILE = 16;
const GOAL_SIZE = 40;

// --- editor state ---
//
// One cursor, two modes:
//   'anchor' — arrows move both cursor and anchor (reach-arc origin) together;
//              the reach envelope follows live as you scout takeoff positions
//   'tile'   — arrows move only the cursor; anchor stays fixed at its last
//              anchor-mode position so you can paint within the frozen envelope
// Toggle with toggleMode(). Entering 'anchor' snaps anchor back to cursor.

export function createEditorState(initialCursor = { x: 480, y: 320 }) {
  const cursor = { x: snapToGrid(initialCursor.x), y: snapToGrid(initialCursor.y) };
  return {
    active: false,
    mode: 'anchor',
    cursor,
    anchor: { ...cursor },
    facing: 1, // +1 right, -1 left
  };
}

export function setEditorActive(state, active) {
  return { ...state, active };
}

// Move cursor by (dx, dy) units of `step`. In 'anchor' mode the anchor and
// facing follow the cursor (live reach-arc tracking). In 'tile' mode both
// the anchor position AND facing stay frozen — only the brush cursor moves.
// step defaults to GRID (16px); pass step=1 for per-pixel movement (anchor).
export function moveCursor(state, dx, dy, step = GRID) {
  const cursor = {
    x: state.cursor.x + dx * step,
    y: state.cursor.y + dy * step,
  };
  const isAnchorMode = state.mode === 'anchor';
  const anchor = isAnchorMode ? { ...cursor } : state.anchor;
  const facing = isAnchorMode
    ? (dx > 0 ? 1 : dx < 0 ? -1 : state.facing)
    : state.facing;
  return { ...state, cursor, anchor, facing };
}

// Toggle between 'anchor' and 'tile' modes.
// - Entering 'anchor': snap anchor to the current cursor so reach tracking
//   resumes there. Cursor unchanged.
// - Entering 'tile': snap cursor to the editor grid so per-press tile
//   placement starts from a clean grid cell (the 1px-step anchor mode may
//   have left it off-grid).
export function toggleMode(state) {
  const mode = state.mode === 'anchor' ? 'tile' : 'anchor';
  if (mode === 'anchor') {
    return { ...state, mode, anchor: { ...state.cursor } };
  }
  const cursor = { x: snapToGrid(state.cursor.x), y: snapToGrid(state.cursor.y) };
  return { ...state, mode, cursor };
}

// --- stage edits ---

function tileAt(cursor) {
  return { x: cursor.x, y: cursor.y, w: TILE, h: TILE };
}

// Toggle / erase at the cursor:
// - If any solid contains the cursor's tile center, remove that solid
//   (eraser — works on platforms of any size, not just 16x16 tiles).
// - Otherwise add a 16x16 tile at the cursor position.
// Returns a new stage.
export function toggleTile(stage, cursor) {
  const cx = cursor.x + TILE / 2;
  const cy = cursor.y + TILE / 2;
  const idx = stage.solids.findIndex(s =>
    cx >= s.x && cx < s.x + s.w && cy >= s.y && cy < s.y + s.h
  );
  const solids = idx >= 0
    ? [...stage.solids.slice(0, idx), ...stage.solids.slice(idx + 1)]
    : [...stage.solids, tileAt(cursor)];
  return { ...stage, solids };
}

export function setSpawn(stage, cursor) {
  return { ...stage, spawn: { x: cursor.x, y: cursor.y } };
}

export function setGoal(stage, cursor) {
  return {
    ...stage,
    goal: { x: cursor.x, y: cursor.y, w: GOAL_SIZE, h: GOAL_SIZE },
  };
}

// Serialize a stage to a stable JSON string. Drops legacy fields (e.g. route).
export function serializeStage(stage) {
  const { id, name, spawn, solids, goal } = stage;
  return JSON.stringify({ id, name, spawn, solids, goal }, null, 2);
}

// Build a blank stage — arena outline only (floor + side walls + ceiling),
// player spawn near bottom-left, no goal. All boundaries are 16px-grid
// aligned (floor h=32, walls w=16, ceiling h=16). Caller assigns name/id.
export function createBlankStage(opts = {}) {
  const {
    screenW = 960, screenH = 640,
    playerH = 24,
    floorH = 32, wallW = 16, ceilingH = 16,
    name = 'Custom Stage',
    id = 0,
  } = opts;
  const floorTop = screenH - floorH;
  return {
    id,
    name,
    spawn: { x: 64, y: floorTop - playerH },
    solids: [
      { x: 0, y: floorTop, w: screenW, h: floorH },           // floor
      { x: 0, y: 0, w: wallW, h: screenH },                   // left wall
      { x: screenW - wallW, y: 0, w: wallW, h: screenH },     // right wall
      { x: 0, y: 0, w: screenW, h: ceilingH },                // ceiling
    ],
    goal: null,
  };
}

// --- reach arcs ---

// Compute the two reach arcs from a takeoff point.
//   takeoff: { x, y }   player FEET-CENTER at jump start
//   facing:  +1 (right) | -1 (left)
//   cfg:     physics config
//   solids:  arcs terminate on first collision so the curve reflects
//            the actual trajectory (lands on platforms, blocked by walls).
// Returns { outer, inner } — arrays of {x,y} traced at feet center.
//   outer = trajectory at vx = facing * moveSpeed
//   inner = trajectory at vx = 0
// Renderers should inflate the resulting polygon by player half-width (±16)
// horizontally and height (24) upward to depict where the player's bbox
// (not just feet) can occupy.
export function computeReachArcs(takeoff, facing, cfg, solids = []) {
  const dir = facing >= 0 ? 1 : -1;
  return {
    outer: simulateArc(takeoff.x, takeoff.y, dir * cfg.moveSpeed, cfg, solids),
    inner: simulateArc(takeoff.x, takeoff.y, 0, cfg, solids),
  };
}

function simulateArc(x0, y0, vx, cfg, solids) {
  const pts = [{ x: x0, y: y0 }];
  let x = x0, y = y0, vy = cfg.jumpVelocity;
  for (let f = 0; f < 300; f++) {
    vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
    x += vx;
    y += vy;
    if (hitsSolid(x, y, solids)) break;
    pts.push({ x, y });
    if (y > y0 + 800) break;
  }
  return pts;
}

function hitsSolid(x, y, solids) {
  for (const s of solids) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

// --- helpers ---

export function snapToGrid(value, grid = GRID) {
  const snapped = Math.round(value / grid) * grid;
  return snapped === 0 ? 0 : snapped;
}

export { GRID, TILE, GOAL_SIZE };
