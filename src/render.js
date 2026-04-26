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

  // Draw reach arcs (outer + inner) and a translucent fill of the area
  // between them — the set of points reachable from a takeoff position.
  // arcs: { outer: [{x,y}], inner: [{x,y}] } from editor.computeReachArcs.
  function drawReachArcs(arcs) {
    if (!arcs?.outer?.length || !arcs?.inner?.length) return;
    ctx.save();

    // Filled region: outer forward + inner reversed → closed polygon.
    ctx.fillStyle = 'rgba(95, 196, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(arcs.outer[0].x, arcs.outer[0].y);
    for (const p of arcs.outer) ctx.lineTo(p.x, p.y);
    for (let i = arcs.inner.length - 1; i >= 0; i--) {
      ctx.lineTo(arcs.inner[i].x, arcs.inner[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Boundary curves
    ctx.strokeStyle = '#5fc4ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    for (const arc of [arcs.outer, arcs.inner]) {
      ctx.beginPath();
      ctx.moveTo(arc[0].x, arc[0].y);
      for (const p of arc) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  return { clear, drawSolids, drawGoal, drawPlayer, drawHud, drawReachArcs };
}
