// Canvas rendering. Side-effectful.

import { SCREEN_W, SCREEN_H } from './level.js';

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

  function drawPlayer(player) {
    const { x, y, w, h } = player;
    // SVG viewBox 0 0 24 24 기준 좌표를 player 너비에 맞게 스케일
    const s = w / 24;
    const p = n => Math.round(n * s);
    // 발바닥이 player 박스 하단에 맞도록 y 오프셋 (SVG 캐릭터 하단 = y=20)
    const yo = h - p(20);

    ctx.fillStyle = '#D97757';
    ctx.fillRect(x + p(3),   y + yo + p(5),  p(18), p(12)); // 몸통
    ctx.fillRect(x,           y + yo + p(11), p(3),  p(3));  // 왼팔
    ctx.fillRect(x + p(21),  y + yo + p(11), p(3),  p(3));  // 오른팔
    ctx.fillRect(x + p(4.5), y + yo + p(17), p(1.5), p(3)); // 발 왼쪽 바깥
    ctx.fillRect(x + p(7.5), y + yo + p(17), p(1.5), p(3)); // 발 왼쪽 안쪽
    ctx.fillRect(x + p(15),  y + yo + p(17), p(1.5), p(3)); // 발 오른쪽 안쪽
    ctx.fillRect(x + p(18),  y + yo + p(17), p(1.5), p(3)); // 발 오른쪽 바깥
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(x + p(6),    y + yo + p(8),  p(1.5), p(3)); // 왼눈
    ctx.fillRect(x + p(16.5), y + yo + p(8),  p(1.5), p(3)); // 오른눈
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

  return { clear, drawSolids, drawGoal, drawPlayer, drawHud };
}
