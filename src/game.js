// Game loop. Wires pure modules to side-effectful IO.

import {
  applyGravity,
  accelerateVx,
  tryJump,
  tryWallJump,
} from './physics.js';
import { config } from './tuning.js';
import { resolveMovement } from './collision.js';
import {
  getStage,
  makePlayer,
  hasReachedGoal,
  isOutOfBounds,
  STAGES,
  SCREEN_W,
  SCREEN_H,
  PLAYER_W,
  PLAYER_H,
} from './level.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import {
  createEditorState,
  setEditorActive,
  moveCursor,
  toggleMode,
  toggleTile,
  setSpawn,
  setGoal,
  serializeStage,
  createBlankStage,
  computeReachArcs,
  snapToGrid,
} from './editor.js';

export function startGame(canvas) {
  const input = createInput();
  const renderer = createRenderer(canvas);

  // Player state (used by both play and editor-test modes).
  let stageId = 0;
  let stage = getStage(stageId);
  let player = makePlayer(stage);
  let vel = { vx: 0, vy: 0 };
  let grounded = false;
  let wallSide = 0;
  let startedAt = performance.now();
  let elapsed = 0;
  let cleared = false;
  let clearTime = 0;

  // Goal physics — falls with gravity until it lands on a solid.
  let goalPos = stage.goal ? { ...stage.goal } : null;
  let goalVel = { vx: 0, vy: 0 };
  let goalGrounded = false;

  // Editor state.
  let editor = createEditorState({ x: stage.spawn.x, y: stage.spawn.y });
  let scratchStage = null;     // working copy while editor active
  let testing = false;         // simulation running inside editor
  let toast = null;            // { text, until: timestamp }

  function showToast(text, ms = 2500) {
    toast = { text, until: performance.now() + ms };
  }

  // --- state helpers (deduplicate reset/enter/test paths) ---

  function resetPlayerOn(srcStage) {
    player = makePlayer(srcStage);
    vel = { vx: 0, vy: 0 };
    grounded = false;
    wallSide = 0;
    startedAt = performance.now();
    elapsed = 0;
    cleared = false;
    if (srcStage?.goal) {
      goalPos = { ...srcStage.goal };
      goalVel = { vx: 0, vy: 0 };
      goalGrounded = false;
    } else {
      goalPos = null;
    }
  }

  function placeEditorCursorAt(point) {
    const cursor = { x: snapToGrid(point.x), y: snapToGrid(point.y) };
    editor = { ...editor, cursor, anchor: { ...cursor } };
  }

  function reset(toStageId = stageId) {
    stageId = toStageId;
    stage = getStage(stageId);
    resetPlayerOn(stage);
  }

  function enterEditor() {
    scratchStage = JSON.parse(JSON.stringify(stage));
    editor = setEditorActive(editor, true);
    placeEditorCursorAt(stage.spawn);
  }

  function exitEditor() {
    editor = setEditorActive(editor, false);
    scratchStage = null;
    testing = false;
  }

  function enterTest() {
    if (!scratchStage) return;
    testing = true;
    resetPlayerOn(scratchStage);
    showToast('Test play — Tab to edit');
  }

  function exitTest() {
    testing = false;
    showToast('Editing');
  }

  function jumpToStage(n) {
    if (n < 0 || n >= STAGES.length) return;
    if (editor.active) {
      stageId = n;
      stage = getStage(n);
      scratchStage = JSON.parse(JSON.stringify(stage));
      placeEditorCursorAt(stage.spawn);
    } else {
      reset(n);
    }
  }

  // --- physics steps ---

  function stepPlayerOn(activeSolids, keys) {
    vel.vx = accelerateVx(vel.vx, keys, config);
    if (input.justPressed('up')) {
      if (grounded) {
        vel.vy = tryJump(vel.vy, true, config);
      } else if (wallSide !== 0) {
        const r = tryWallJump(vel.vx, vel.vy, wallSide, config);
        vel.vx = r.vx;
        vel.vy = r.vy;
      }
    }
    const sliding = wallSide !== 0 && !grounded && vel.vy > 0;
    vel.vy = applyGravity(vel.vy, sliding, config);
    const result = resolveMovement(player, vel, activeSolids);
    player = { ...player, x: result.pos.x, y: result.pos.y };
    vel = result.vel;
    grounded = result.grounded;
    wallSide = result.wallSide;
  }

  function stepGoalOn(activeSolids) {
    if (!goalPos || goalGrounded) return;
    goalVel.vy = applyGravity(goalVel.vy, false, config);
    const result = resolveMovement(goalPos, goalVel, activeSolids);
    goalPos = { ...goalPos, x: result.pos.x, y: result.pos.y };
    goalVel = result.vel;
    goalGrounded = result.grounded;
  }

  // --- per-mode update ---

  function updateGameplay(activeStage, onOutOfBounds) {
    const keys = input.snapshot();
    if (cleared) return;
    stepPlayerOn(activeStage.solids, keys);
    stepGoalOn(activeStage.solids);
    if (isOutOfBounds(player)) onOutOfBounds();
    if (goalPos && hasReachedGoal(player, { goal: goalPos })) {
      cleared = true;
      clearTime = elapsed;
    }
    elapsed = (performance.now() - startedAt) / 1000;
  }

  function updateEditor() {
    if (input.justPressed('left'))  editor = moveCursor(editor, -1, 0);
    if (input.justPressed('right')) editor = moveCursor(editor,  1, 0);
    if (input.justPressed('up'))    editor = moveCursor(editor,  0, -1);
    if (input.justPressed('down'))  editor = moveCursor(editor,  0,  1);
    if (input.justPressed('toggleMode')) editor = toggleMode(editor);
    if (input.justPressed('space'))    scratchStage = toggleTile(scratchStage, editor.cursor);
    if (input.justPressed('setSpawn')) scratchStage = setSpawn(scratchStage, editor.cursor);
    if (input.justPressed('setGoal'))  scratchStage = setGoal(scratchStage, editor.cursor);
    if (input.justPressed('save'))     saveStage();
    if (input.justPressed('newStage')) startBlankStage();
  }

  function saveStage() {
    const json = serializeStage(scratchStage);
    showToast('Saving...');
    fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(d => showToast(`Saved as ${d.file}. Tell Claude.`))
      .catch(err => {
        console.error('save failed:', err);
        showToast('Save failed (run server.js?)');
      });
  }

  function startBlankStage() {
    scratchStage = createBlankStage({
      screenW: SCREEN_W, screenH: SCREEN_H,
      playerW: PLAYER_W, playerH: PLAYER_H,
      id: STAGES.length,
      name: `Custom Stage ${STAGES.length}`,
    });
    placeEditorCursorAt(scratchStage.spawn);
    showToast('Blank stage');
  }

  // --- per-frame render ---

  function render() {
    const renderStage = editor.active ? scratchStage : stage;
    renderer.clear();
    if (editor.active) renderer.drawGrid();
    renderer.drawSolids(renderStage.solids);
    // In edit-only mode goal stays at static placement; in play/test the
    // physics-driven goalPos shows where it actually settled.
    const liveGoal = (editor.active && !testing) ? renderStage.goal : goalPos;
    renderer.drawGoal(liveGoal);

    if (editor.active && testing) {
      renderer.drawSpawn(renderStage.spawn);
      renderer.drawPlayer(player, vel.vx);
    } else if (editor.active) {
      renderer.drawSpawn(renderStage.spawn);
      const feet = { x: editor.anchor.x + 8, y: editor.anchor.y + 16 };
      const arcs = computeReachArcs(feet, editor.facing, config, renderStage.solids);
      renderer.drawReachArcs(arcs);
      renderer.drawAnchor(editor.anchor);
      renderer.drawCursor(editor.cursor, editor.facing);
    } else {
      renderer.drawPlayer(player, vel.vx);
    }

    renderer.drawHud({
      stageName: hudLabel(renderStage),
      time: cleared ? clearTime : elapsed,
      hint: hintFor(stage, cleared, editor.active, testing),
      status: clearStatus(),
    });

    if (toast && performance.now() < toast.until) {
      renderer.drawToast(toast.text);
    }
  }

  function hudLabel(rs) {
    if (!editor.active) return stage.name;
    return testing ? `TEST — ${rs.name}` : `EDIT [${editor.mode}] — ${rs.name}`;
  }

  function clearStatus() {
    if (!cleared) return null;
    if (editor.active && !testing) return null;
    if (editor.active) {
      return {
        title: 'CLEAR!',
        subtitle: `Time: ${clearTime.toFixed(2)}s — Tab to edit, R to retry`,
      };
    }
    const next = stageId + 1 < STAGES.length;
    return {
      title: 'CLEAR!',
      subtitle: next
        ? `Time: ${clearTime.toFixed(2)}s — Press SPACE for next stage, R to retry`
        : `Time: ${clearTime.toFixed(2)}s — Press R to retry`,
    };
  }

  function hintFor(s, isCleared, isEdit, isTest) {
    if (isTest) return 'A/D ←→: move   W ↑: jump   R: reset   Tab: back to edit   E: exit editor';
    if (isEdit) return '←→↑↓: move   T: anchor↔tile   SPACE: tile/erase   P/G: spawn/goal   N: blank   0-5: load   Tab: test   S: save   E: exit';
    if (isCleared) return null;
    if (s.id === 0) return 'A/D: move   W: jump   SPACE: Stage 1   0-5: stage   R: reset   E: editor';
    return 'A/D: move   W: jump   0-5: stage   R: reset   E: editor';
  }

  // --- main tick ---

  function tick() {
    // Mode-agnostic global keys
    if (input.justPressed('editor')) {
      if (editor.active) exitEditor();
      else enterEditor();
    }
    for (let n = 0; n <= 9; n++) {
      if (input.justPressed('stage' + n)) { jumpToStage(n); break; }
    }
    if (editor.active && input.justPressed('testPlay')) {
      if (testing) exitTest(); else enterTest();
    }

    // Mode-specific update
    if (editor.active && testing) {
      if (input.justPressed('restart')) resetPlayerOn(scratchStage);
      updateGameplay(scratchStage, () => resetPlayerOn(scratchStage));
    } else if (editor.active) {
      updateEditor();
    } else {
      if (input.justPressed('restart')) reset();
      if (input.justPressed('space')) {
        if (cleared && stageId + 1 < STAGES.length) reset(stageId + 1);
        else if (stage.goal === null && stageId === 0) reset(1);
      }
      updateGameplay(stage, () => reset());
    }

    render();
    input.endFrame();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
