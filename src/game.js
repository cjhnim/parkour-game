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
} from './level.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';

export function startGame(canvas, { onStageChange } = {}) {
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

  function reset(toStageId = stageId) {
    stageId = toStageId;
    stage = getStage(stageId);
    onStageChange?.(stage);
    player = makePlayer(stage);
    vel = { vx: 0, vy: 0 };
    grounded = false;
    wallSide = 0;
    startedAt = performance.now();
    elapsed = 0;
    cleared = false;
  }

  function tick() {
    const keys = input.snapshot();

    // Restart
    if (input.justPressed('restart')) reset();

    // Tutorial → Stage 1 (or post-clear → next stage)
    if (input.justPressed('next')) {
      if (cleared && stageId + 1 < STAGES.length) {
        reset(stageId + 1);
      } else if (stage.goal === null && stageId === 0) {
        reset(1);
      }
    }

    if (!cleared) {
      // Acceleration-based horizontal movement
      vel.vx = accelerateVx(vel.vx, keys, config);

      // Jump: grounded → normal jump, air + wall → wall jump
      if (input.justPressed('jump')) {
        if (grounded) {
          vel.vy = tryJump(vel.vy, true, config);
        } else if (wallSide !== 0) {
          const r = tryWallJump(vel.vx, vel.vy, wallSide, config);
          vel.vx = r.vx;
          vel.vy = r.vy;
        }
      }

      // Gravity (wall-slide cap when sliding down a wall)
      const sliding = wallSide !== 0 && !grounded && vel.vy > 0;
      vel.vy = applyGravity(vel.vy, sliding, config);

      // Resolve collisions
      const result = resolveMovement(player, vel, stage.solids);
      player = { ...player, x: result.pos.x, y: result.pos.y };
      vel = result.vel;
      grounded = result.grounded;
      wallSide = result.wallSide;

      // Out-of-bounds → respawn
      if (isOutOfBounds(player)) {
        reset();
      }

      // Goal
      if (hasReachedGoal(player, stage)) {
        cleared = true;
        clearTime = elapsed;
      }

      elapsed = (performance.now() - startedAt) / 1000;
    }

    // Render
    renderer.clear();
    renderer.drawSolids(stage.solids);
    renderer.drawGoal(stage.goal);
    renderer.drawPlayer(player);
    renderer.drawHud({
      stageName: stage.name,
      time: cleared ? clearTime : elapsed,
      hint: hintFor(stage, cleared),
      status: cleared
        ? {
            title: 'CLEAR!',
            subtitle:
              stageId + 1 < STAGES.length
                ? `Time: ${clearTime.toFixed(2)}s — Press SPACE for next stage, R to retry`
                : `Time: ${clearTime.toFixed(2)}s — Press R to retry`,
          }
        : null,
    });

    input.endFrame();
    requestAnimationFrame(tick);
  }

  function hintFor(s, isCleared) {
    if (isCleared) return null;
    if (s.id === 0) return 'A/D: move   W: jump   SPACE: start Stage 1   R: reset';
    return 'A/D: move   W: jump (wall jump too)   R: reset';
  }

  requestAnimationFrame(tick);
}
