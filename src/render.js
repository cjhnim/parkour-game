// Canvas rendering. Side-effectful.

import { SCREEN_W, SCREEN_H, PLAYER_W, PLAYER_H } from './level.js';

export function createRenderer(canvas) {
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');

  function clear() {
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  function drawSolids(solids) {
    ctx.fillStyle = '#3d3d52';
    for (const s of solids) ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  function drawGoal(goal) {
    if (!goal) return;
    ctx.fillStyle = '#f5d76e';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', goal.x + goal.w / 2, goal.y + goal.h / 2 + 5);
  }

  function drawPlayer(player, vx = 0) {
    const { x, y, w, h } = player;
    // SVG 콘텐츠: 너비 24, 높이 20 (y=0~20) — 가로세로 스케일 분리
    const px = n => Math.round(n * w / 24);
    const py = n => Math.round(n * h / 20);
    const eyeShift = vx > 0 ? px(1.5) : vx < 0 ? -px(1.5) : 0;

    ctx.fillStyle = '#D97757';
    ctx.fillRect(x + px(3),   y + py(5),  px(18), py(12)); // 몸통
    ctx.fillRect(x,            y + py(11), px(3),  py(3));  // 왼팔
    ctx.fillRect(x + px(21),  y + py(11), px(3),  py(3));  // 오른팔
    ctx.fillRect(x + px(4.5), y + py(17), px(1.5), py(3)); // 발 왼쪽 바깥
    ctx.fillRect(x + px(7.5), y + py(17), px(1.5), py(3)); // 발 왼쪽 안쪽
    ctx.fillRect(x + px(15),  y + py(17), px(1.5), py(3)); // 발 오른쪽 안쪽
    ctx.fillRect(x + px(18),  y + py(17), px(1.5), py(3)); // 발 오른쪽 바깥
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(x + px(6)    + eyeShift, y + py(8), px(1.5), py(3)); // 왼눈
    ctx.fillRect(x + px(16.5) + eyeShift, y + py(8), px(1.5), py(3)); // 오른눈
  }

  function drawHud({ stageName, time, status, hint }) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(stageName, 30, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`${time.toFixed(2)}s`, SCREEN_W - 30, 40);

    if (hint) {
      ctx.fillStyle = '#aaa';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hint, SCREEN_W / 2, SCREEN_H - 15);
    }

    if (status) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, SCREEN_H / 2 - 60, SCREEN_W, 120);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(status.title, SCREEN_W / 2, SCREEN_H / 2 - 5);
      ctx.font = '14px monospace';
      ctx.fillText(status.subtitle, SCREEN_W / 2, SCREEN_H / 2 + 25);
    }
  }

  // 16px grid dots, drawn as a faint background (editor mode only).
  function drawGrid(grid = 16) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 0; y < SCREEN_H; y += grid) {
      for (let x = 0; x < SCREEN_W; x += grid) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.restore();
  }

  // Cursor in editor mode: hollow yellow square + facing chevron.
  function drawCursor(cursor, facing = 1, size = 16) {
    ctx.save();
    ctx.strokeStyle = '#f5d76e';
    ctx.lineWidth = 2;
    ctx.strokeRect(cursor.x, cursor.y, size, size);
    // Facing chevron just outside the cursor
    ctx.fillStyle = '#f5d76e';
    ctx.beginPath();
    if (facing >= 0) {
      ctx.moveTo(cursor.x + size + 2, cursor.y);
      ctx.lineTo(cursor.x + size + 8, cursor.y + size / 2);
      ctx.lineTo(cursor.x + size + 2, cursor.y + size);
    } else {
      ctx.moveTo(cursor.x - 2, cursor.y);
      ctx.lineTo(cursor.x - 8, cursor.y + size / 2);
      ctx.lineTo(cursor.x - 2, cursor.y + size);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Anchor marker (cyan crosshair) — origin of the reach arc envelope.
  // Sits inside the 16×16 anchor cell so it doesn't bleed into neighbouring tiles.
  function drawAnchor(anchor, size = 16) {
    if (!anchor) return;
    const cx = anchor.x + size / 2;
    const cy = anchor.y + size / 2;
    ctx.save();
    ctx.strokeStyle = '#5fc4ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(anchor.x, cy);
    ctx.lineTo(anchor.x + size, cy);
    ctx.moveTo(cx, anchor.y);
    ctx.lineTo(cx, anchor.y + size);
    ctx.stroke();
    ctx.restore();
  }

  // Spawn marker (green dot) — distinct from player so user sees where
  // the player will respawn. Only useful in editor mode.
  function drawSpawn(spawn) {
    if (!spawn) return;
    ctx.save();
    ctx.fillStyle = '#5fff8a';
    ctx.beginPath();
    ctx.arc(spawn.x + 16, spawn.y + 12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5fff8a';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPAWN', spawn.x + 16, spawn.y - 4);
    ctx.restore();
  }

  // Editor toast — top-center text overlay (e.g., "Saved. Tell Claude.")
  function drawToast(text) {
    if (!text) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const w = text.length * 8 + 24;
    ctx.fillRect(SCREEN_W / 2 - w / 2, 60, w, 28);
    ctx.fillStyle = '#5fc4ff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, SCREEN_W / 2, 74);
    ctx.restore();
  }

  // Draw the reach envelope from a feet-center takeoff position.
  // The polygon is bounded by the feet trajectory itself — no inflation —
  // so all edges align with where the FEET can be. The character body's
  // ±16/24 extent is left to the designer's mental adjustment.
  // arcs: { outer, inner } from editor.computeReachArcs (feet trajectory).
  function drawReachArcs(arcs) {
    if (!arcs?.outer?.length) return;
    const outer = arcs.outer;
    const startX = outer[0].x;
    const farY = outer[outer.length - 1].y;
    let peakIdx = 0;
    for (let i = 1; i < outer.length; i++) {
      if (outer[i].y < outer[peakIdx].y) peakIdx = i;
    }
    const peak = outer[peakIdx];

    ctx.save();

    // Fill region
    ctx.fillStyle = 'rgba(95, 196, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(startX, peak.y);
    ctx.lineTo(peak.x, peak.y);
    for (let i = peakIdx; i < outer.length; i++) {
      ctx.lineTo(outer[i].x, outer[i].y);
    }
    ctx.lineTo(startX, farY);
    ctx.closePath();
    ctx.fill();

    // Outer feet trajectory (dashed)
    ctx.strokeStyle = '#5fc4ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y);
    for (const p of outer) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.restore();
  }

  return {
    clear, drawSolids, drawGoal, drawPlayer, drawHud,
    drawReachArcs, drawGrid, drawCursor, drawAnchor, drawSpawn, drawToast,
  };
}
