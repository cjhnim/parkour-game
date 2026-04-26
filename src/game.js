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
  // Goal physics — goal box falls with gravity until it lands on a solid.
  let goalPos = stage.goal ? { ...stage.goal } : null;
  let goalVel = { vx: 0, vy: 0 };
  let goalGrounded = false;

  // --- editor state ---
  let editor = createEditorState({ x: stage.spawn.x, y: stage.spawn.y });
  let scratchStage = null;     // working copy while editor active
  let testing = false;         // simulation running inside editor
  let toast = null;            // { text, until: timestamp }

  function resetGoalFrom(srcStage) {
    if (srcStage?.goal) {
      goalPos = { ...srcStage.goal };
      goalVel = { vx: 0, vy: 0 };
      goalGrounded = false;
    } else {
      goalPos = null;
    }
  }

  function reset(toStageId = stageId) {
    stageId = toStageId;
    stage = getStage(stageId);
    player = makePlayer(stage);
    vel = { vx: 0, vy: 0 };
    grounded = false;
    wallSide = 0;
    startedAt = performance.now();
    elapsed = 0;
    cleared = false;
    resetGoalFrom(stage);
  }

  function showToast(text, ms = 2500) {
    toast = { text, until: performance.now() + ms };
  }

  function enterEditor() {
    scratchStage = JSON.parse(JSON.stringify(stage));
    // Snap cursor to grid — spawn coords may be off-grid (e.g. 584 = floorTop − PLAYER_H).
    const cursor = { x: snapToGrid(stage.spawn.x), y: snapToGrid(stage.spawn.y) };
    editor = setEditorActive({
      ...editor,
      cursor,
      anchor: { ...cursor },
    }, true);
  }

  function exitEditor() {
    editor = setEditorActive(editor, false);
    scratchStage = null;
    testing = false;
  }

  function enterTest() {
    if (!scratchStage) return;
    testing = true;
    cleared = false;
    player = makePlayer(scratchStage);
    vel = { vx: 0, vy: 0 };
    grounded = false;
    wallSide = 0;
    startedAt = performance.now();
    elapsed = 0;
    resetGoalFrom(scratchStage);
    showToast('Test play — Tab to edit');
  }

  function exitTest() {
    testing = false;
    showToast('Editing');
  }

  function resetTest() {
    if (!scratchStage) return;
    player = makePlayer(scratchStage);
    vel = { vx: 0, vy: 0 };
    grounded = false;
    wallSide = 0;
    startedAt = performance.now();
    elapsed = 0;
    cleared = false;
    resetGoalFrom(scratchStage);
  }

  // Apply gravity + collision to the goal box. Stops falling once it lands.
  function tickGoal(activeSolids) {
    if (!goalPos || goalGrounded) return;
    goalVel.vy = applyGravity(goalVel.vy, false, config);
    const result = resolveMovement(goalPos, goalVel, activeSolids);
    goalPos = { ...goalPos, x: result.pos.x, y: result.pos.y };
    goalVel = result.vel;
    goalGrounded = result.grounded;
  }

  function jumpToStage(n) {
    if (n < 0 || n >= STAGES.length) return;
    if (editor.active) {
      // Replace working copy with a clone of the chosen stage
      stageId = n;
      stage = getStage(n);
      scratchStage = JSON.parse(JSON.stringify(stage));
      const cursor = { x: snapToGrid(stage.spawn.x), y: snapToGrid(stage.spawn.y) };
      editor = { ...editor, cursor, anchor: { ...cursor } };
    } else {
      reset(n);
    }
  }

  function tick() {
    // E toggles editor anywhere
    if (input.justPressed('editor')) {
      if (editor.active) exitEditor();
      else enterEditor();
    }

    // Stage jump (works in both modes)
    for (let n = 0; n <= 9; n++) {
      if (input.justPressed('stage' + n)) { jumpToStage(n); break; }
    }

    // Tab toggles in-editor simulation (only meaningful while editor active)
    if (editor.active && input.justPressed('testPlay')) {
      if (testing) exitTest();
      else enterTest();
    }

    if (editor.active && testing) {
      // Test simulation against scratchStage — full physics, scoped within editor.
      const keys = input.snapshot();
      if (input.justPressed('restart')) resetTest();
      if (!cleared) {
        vel.vx = accelerateVx(vel.vx, keys, config);
        if (input.justPressed('up')) {
          if (grounded) vel.vy = tryJump(vel.vy, true, config);
          else if (wallSide !== 0) {
            const r = tryWallJump(vel.vx, vel.vy, wallSide, config);
            vel.vx = r.vx;
            vel.vy = r.vy;
          }
        }
        const sliding = wallSide !== 0 && !grounded && vel.vy > 0;
        vel.vy = applyGravity(vel.vy, sliding, config);
        const result = resolveMovement(player, vel, scratchStage.solids);
        player = { ...player, x: result.pos.x, y: result.pos.y };
        vel = result.vel;
        grounded = result.grounded;
        wallSide = result.wallSide;
        tickGoal(scratchStage.solids);
        if (isOutOfBounds(player)) resetTest();
        if (goalPos && hasReachedGoal(player, { goal: goalPos })) { cleared = true; clearTime = elapsed; }
        elapsed = (performance.now() - startedAt) / 1000;
      }
    } else if (editor.active) {
      // Editor input — both modes step at GRID (16px) so the cursor and
      // anchor crosshair stay tile-aligned. Mode only differs in trigger
      // and whether anchor follows:
      //   anchor mode → per-press at GRID, anchor follows cursor
      //   tile  mode  → per-press at GRID, anchor stays
      if (input.justPressed('left'))  editor = moveCursor(editor, -1, 0);
      if (input.justPressed('right')) editor = moveCursor(editor,  1, 0);
      if (input.justPressed('up'))    editor = moveCursor(editor,  0, -1);
      if (input.justPressed('down'))  editor = moveCursor(editor,  0,  1);
      if (input.justPressed('toggleMode')) editor = toggleMode(editor);
      if (input.justPressed('space')) {
        scratchStage = toggleTile(scratchStage, editor.cursor);
      }
      if (input.justPressed('setSpawn')) {
        scratchStage = setSpawn(scratchStage, editor.cursor);
      }
      if (input.justPressed('setGoal')) {
        scratchStage = setGoal(scratchStage, editor.cursor);
      }
      if (input.justPressed('save')) {
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
      if (input.justPressed('newStage')) {
        scratchStage = createBlankStage({
          screenW: SCREEN_W, screenH: SCREEN_H,
          playerW: PLAYER_W, playerH: PLAYER_H,
          id: STAGES.length, // next available — won't overwrite an existing stage on save
          name: `Custom Stage ${STAGES.length}`,
        });
        const cursor = {
          x: snapToGrid(scratchStage.spawn.x),
          y: snapToGrid(scratchStage.spawn.y),
        };
        editor = { ...editor, cursor, anchor: { ...cursor } };
        showToast('Blank stage');
      }
    } else {
      // Play mode
      const keys = input.snapshot();

      if (input.justPressed('restart')) reset();

      if (input.justPressed('space')) {
        if (cleared && stageId + 1 < STAGES.length) {
          reset(stageId + 1);
        } else if (stage.goal === null && stageId === 0) {
          reset(1);
        }
      }

      if (!cleared) {
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

        const result = resolveMovement(player, vel, stage.solids);
        player = { ...player, x: result.pos.x, y: result.pos.y };
        vel = result.vel;
        grounded = result.grounded;
        wallSide = result.wallSide;
        tickGoal(stage.solids);

        if (isOutOfBounds(player)) reset();
        if (goalPos && hasReachedGoal(player, { goal: goalPos })) {
          cleared = true;
          clearTime = elapsed;
        }

        elapsed = (performance.now() - startedAt) / 1000;
      }
    }

    // --- Render ---
    const renderStage = editor.active ? scratchStage : stage;
    renderer.clear();
    if (editor.active) renderer.drawGrid();
    renderer.drawSolids(renderStage.solids);
    // Goal: in edit-only mode use static placement; in play/test use the
    // physics-driven goalPos so the box is shown where it actually settled.
    const liveGoal = (editor.active && !testing) ? renderStage.goal : goalPos;
    renderer.drawGoal(liveGoal);

    if (editor.active && testing) {
      renderer.drawSpawn(renderStage.spawn);
      renderer.drawPlayer(player, vel.vx);
    } else if (editor.active) {
      renderer.drawSpawn(renderStage.spawn);
      // Anchor's feet-center = bottom-middle of the 16×16 anchor box.
      const feet = { x: editor.anchor.x + 8, y: editor.anchor.y + 16 };
      const arcs = computeReachArcs(feet, editor.facing, config, renderStage.solids);
      renderer.drawReachArcs(arcs);
      renderer.drawAnchor(editor.anchor);
      renderer.drawCursor(editor.cursor, editor.facing);
    } else {
      renderer.drawPlayer(player, vel.vx);
    }

    const hudLabel = editor.active
      ? (testing ? `TEST — ${renderStage.name}` : `EDIT [${editor.mode}] — ${renderStage.name}`)
      : stage.name;
    renderer.drawHud({
      stageName: hudLabel,
      time: cleared ? clearTime : elapsed,
      hint: hintFor(stage, cleared, editor.active, testing),
      status: cleared && (!editor.active || testing)
        ? {
            title: 'CLEAR!',
            subtitle: editor.active
              ? `Time: ${clearTime.toFixed(2)}s — Tab to edit, R to retry`
              : (stageId + 1 < STAGES.length
                  ? `Time: ${clearTime.toFixed(2)}s — Press SPACE for next stage, R to retry`
                  : `Time: ${clearTime.toFixed(2)}s — Press R to retry`),
          }
        : null,
    });

    if (toast && performance.now() < toast.until) {
      renderer.drawToast(toast.text);
    }

    input.endFrame();
    requestAnimationFrame(tick);
  }

  function hintFor(s, isCleared, isEdit, isTest) {
    if (isTest) return 'A/D ←→: move   W ↑: jump   R: reset   Tab: back to edit   E: exit editor';
    if (isEdit) return '←→↑↓: move   T: anchor↔tile   SPACE: tile/erase   P/G: spawn/goal   N: blank   0-5: load   Tab: test   S: save   E: exit';
    if (isCleared) return null;
    if (s.id === 0) return 'A/D: move   W: jump   SPACE: Stage 1   0-5: stage   R: reset   E: editor';
    return 'A/D: move   W: jump   0-5: stage   R: reset   E: editor';
  }

  requestAnimationFrame(tick);
}
